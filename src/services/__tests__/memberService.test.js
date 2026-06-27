/**
 * Tests de memberService.
 *
 * Se mockean los modelos de Sequelize y la conexión: probamos la LÓGICA y el
 * CONTRATO del servicio sin depender de una base de datos real. El helper
 * calcularVencimiento se deja REAL porque es una función pura.
 */

jest.mock('../../models/Member', () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  findAndCountAll: jest.fn(),
  associations: { Payments: true }, // evita el branch de hasMany en getAllMembers
  hasMany: jest.fn()
}));
jest.mock('../../models/Payment', () => ({ create: jest.fn() }));
jest.mock('../../models/Membresia', () => ({ findOne: jest.fn() }));
jest.mock('../../config/database', () => ({ transaction: jest.fn() }));

const Member = require('../../models/Member');
const Payment = require('../../models/Payment');
const Membresia = require('../../models/Membresia');
const sequelize = require('../../config/database');
const { calcularVencimiento } = require('../../utils/membresiaHelper');
const memberService = require('../memberService');

describe('memberService', () => {
  let tx;

  beforeEach(() => {
    jest.clearAllMocks();
    tx = { commit: jest.fn().mockResolvedValue(), rollback: jest.fn().mockResolvedValue() };
    sequelize.transaction.mockResolvedValue(tx);
  });

  describe('createMember', () => {
    test('SIN membresía: crea el miembro como "vencido" y NO crea pago', async () => {
      Member.create.mockResolvedValue({ id_miembro: 10 });

      await memberService.createMember(1, { nombre: 'Ana', apellido: 'Pérez' });

      expect(Member.create).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: 'Ana', id_gimnasio: 1, estado: 'vencido' }),
        { transaction: tx }
      );
      expect(Payment.create).not.toHaveBeenCalled();
      expect(tx.commit).toHaveBeenCalled();
      expect(tx.rollback).not.toHaveBeenCalled();
    });

    test('CON membresía (efectivo): crea el miembro "activo" y registra el pago vinculado', async () => {
      Member.create.mockResolvedValue({ id_miembro: 10 });
      Membresia.findOne.mockResolvedValue({
        id_membresia: 5, id_gimnasio: 1, precio: '500.00', duracion_dias: 30
      });

      await memberService.createMember(1, { nombre: 'Ana', id_membresia: 5 });

      expect(Member.create).toHaveBeenCalledWith(
        expect.objectContaining({ estado: 'activo', id_gimnasio: 1 }),
        { transaction: tx }
      );
      expect(Membresia.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id_membresia: 5, id_gimnasio: 1 } })
      );
      expect(Payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id_miembro: 10,
          id_membresia: 5,
          id_gimnasio: 1,
          monto: '500.00',
          metodo_pago: 'efectivo', // default cuando no se especifica
          fecha_vencimiento: calcularVencimiento(30)
        }),
        { transaction: tx }
      );
      expect(tx.commit).toHaveBeenCalled();
    });

    test('respeta el metodo_pago explícito (transferencia)', async () => {
      Member.create.mockResolvedValue({ id_miembro: 11 });
      Membresia.findOne.mockResolvedValue({ id_membresia: 5, id_gimnasio: 1, precio: '300.00', duracion_dias: 7 });

      await memberService.createMember(1, { nombre: 'Leo', id_membresia: 5, metodo_pago: 'transferencia' });

      expect(Payment.create).toHaveBeenCalledWith(
        expect.objectContaining({ metodo_pago: 'transferencia' }),
        { transaction: tx }
      );
    });

    test('SaaS-safe: el monto sale de la DB, NO de un precio enviado por el cliente', async () => {
      Member.create.mockResolvedValue({ id_miembro: 12 });
      Membresia.findOne.mockResolvedValue({ id_membresia: 5, id_gimnasio: 1, precio: '999.00', duracion_dias: 365 });

      // El cliente intenta inyectar un monto/precio falso
      await memberService.createMember(1, { nombre: 'Hacker', id_membresia: 5, monto: 1, precio: 1 });

      expect(Payment.create).toHaveBeenCalledWith(
        expect.objectContaining({ monto: '999.00' }),
        { transaction: tx }
      );
    });

    test('membresía inexistente: lanza error y hace rollback sin commitear', async () => {
      Member.create.mockResolvedValue({ id_miembro: 13 });
      Membresia.findOne.mockResolvedValue(null);

      await expect(
        memberService.createMember(1, { nombre: 'Ana', id_membresia: 999 })
      ).rejects.toThrow('Membresía no encontrada o no válida para este gimnasio');

      expect(Payment.create).not.toHaveBeenCalled();
      expect(tx.rollback).toHaveBeenCalled();
      expect(tx.commit).not.toHaveBeenCalled();
    });

    test('si falla la creación del pago: hace rollback y propaga el error', async () => {
      Member.create.mockResolvedValue({ id_miembro: 14 });
      Membresia.findOne.mockResolvedValue({ id_membresia: 5, id_gimnasio: 1, precio: '500.00', duracion_dias: 30 });
      Payment.create.mockRejectedValue(new Error('FK violation'));

      await expect(
        memberService.createMember(1, { nombre: 'Ana', id_membresia: 5 })
      ).rejects.toThrow('FK violation');

      expect(tx.rollback).toHaveBeenCalled();
      expect(tx.commit).not.toHaveBeenCalled();
    });
  });

  describe('getAllMembers', () => {
    test('aplana fecha_vencimiento y el nombre de la membresía del último pago', async () => {
      Member.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: [{
          toJSON: () => ({
            id_miembro: 1,
            nombre: 'Ana',
            Payments: [{ fecha_vencimiento: '2026-07-01', Membresia: { nombre: 'Mensual', duracion_dias: 30, precio: '500' } }]
          })
        }]
      });

      const result = await memberService.getAllMembers(1, { page: 1, limit: 10 });

      expect(result.data[0]).toEqual(expect.objectContaining({
        id_miembro: 1,
        fecha_vencimiento: '2026-07-01',
        membresia: 'Mensual'
      }));
      expect(result.totalPages).toBe(1);
    });

    test('miembro sin pagos: fecha_vencimiento y membresia quedan en null', async () => {
      Member.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: [{ toJSON: () => ({ id_miembro: 2, nombre: 'Beto', Payments: [] }) }]
      });

      const result = await memberService.getAllMembers(1, { page: 1, limit: 10 });

      expect(result.data[0].fecha_vencimiento).toBeNull();
      expect(result.data[0].membresia).toBeNull();
    });
  });
});
