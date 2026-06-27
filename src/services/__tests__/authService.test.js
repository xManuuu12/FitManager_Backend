/**
 * Tests de authService.updateUser.
 * Se mockea el modelo User: probamos la lógica de actualización, el aislamiento
 * por gimnasio (SaaS-safe), la validación de rol y la unicidad de email.
 */

jest.mock('../../models/User', () => ({ findOne: jest.fn(), count: jest.fn() }));
jest.mock('../../models/Gimnasio', () => ({ create: jest.fn() }));

const User = require('../../models/User');
const authService = require('../authService');

// Helper: instancia falsa de usuario con update(), destroy() y toJSON()
function fakeUser(overrides = {}) {
  const base = { id_usuario: 1, id_gimnasio: 7, nombre: 'Ana', email: 'ana@gym.com', rol: 'recepcion', password: 'hash', ...overrides };
  return {
    ...base,
    update: jest.fn().mockResolvedValue(),
    destroy: jest.fn().mockResolvedValue(),
    toJSON: () => ({ ...base })
  };
}

describe('authService.updateUser', () => {
  beforeEach(() => jest.clearAllMocks());

  test('SaaS-safe: busca al usuario filtrando por id_usuario E id_gimnasio', async () => {
    User.findOne.mockResolvedValue(fakeUser());

    await authService.updateUser(7, 1, { nombre: 'Nuevo' });

    expect(User.findOne).toHaveBeenCalledWith({ where: { id_usuario: 1, id_gimnasio: 7 } });
  });

  test('usuario inexistente: lanza error y no actualiza', async () => {
    User.findOne.mockResolvedValue(null);

    await expect(authService.updateUser(7, 999, { nombre: 'X' }))
      .rejects.toThrow('Usuario no encontrado');
  });

  test('actualiza nombre/email y NUNCA devuelve el password', async () => {
    const user = fakeUser();
    User.findOne.mockResolvedValueOnce(user).mockResolvedValueOnce(null); // 2do findOne = chequeo de email

    const result = await authService.updateUser(7, 1, { nombre: 'Ana María', email: 'nuevo@gym.com' });

    expect(user.update).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: 'Ana María', email: 'nuevo@gym.com' })
    );
    expect(result.password).toBeUndefined();
  });

  test('password vacío: se descarta y no se intenta guardar', async () => {
    const user = fakeUser();
    User.findOne.mockResolvedValue(user);

    await authService.updateUser(7, 1, { nombre: 'Ana', password: '' });

    const dataGuardada = user.update.mock.calls[0][0];
    expect(dataGuardada).not.toHaveProperty('password');
  });

  test('NO permite cambiar id_gimnasio ni id_usuario', async () => {
    const user = fakeUser();
    User.findOne.mockResolvedValue(user);

    await authService.updateUser(7, 1, { nombre: 'Ana', id_gimnasio: 99, id_usuario: 500 });

    const dataGuardada = user.update.mock.calls[0][0];
    expect(dataGuardada).not.toHaveProperty('id_gimnasio');
    expect(dataGuardada).not.toHaveProperty('id_usuario');
  });

  test('rol inválido: lanza error', async () => {
    User.findOne.mockResolvedValue(fakeUser());

    await expect(authService.updateUser(7, 1, { rol: 'superadmin' }))
      .rejects.toThrow('Rol inválido');
  });

  test('email duplicado en el mismo gimnasio: lanza error', async () => {
    const user = fakeUser({ email: 'ana@gym.com' });
    User.findOne
      .mockResolvedValueOnce(user)                 // el usuario a editar
      .mockResolvedValueOnce(fakeUser({ id_usuario: 2 })); // ya existe otro con ese email

    await expect(authService.updateUser(7, 1, { email: 'ocupado@gym.com' }))
      .rejects.toThrow('El email ya está registrado en este gimnasio');

    expect(user.update).not.toHaveBeenCalled();
  });

  test('no chequea email si no cambió', async () => {
    const user = fakeUser({ email: 'ana@gym.com' });
    User.findOne.mockResolvedValue(user);

    await authService.updateUser(7, 1, { email: 'ana@gym.com', nombre: 'Ana 2' });

    // Solo el findOne inicial (buscar usuario), no el de chequeo de email
    expect(User.findOne).toHaveBeenCalledTimes(1);
    expect(user.update).toHaveBeenCalled();
  });
});

describe('authService.deleteUser', () => {
  beforeEach(() => jest.clearAllMocks());

  test('anti-lockout: no podés eliminar tu propio usuario', async () => {
    await expect(authService.deleteUser(7, 5, 5))
      .rejects.toThrow('No puedes eliminar tu propio usuario');
    expect(User.findOne).not.toHaveBeenCalled();
  });

  test('SaaS-safe: busca filtrando por id_usuario E id_gimnasio', async () => {
    User.findOne.mockResolvedValue(fakeUser({ id_usuario: 2, rol: 'recepcion' }));

    await authService.deleteUser(7, 2, 1);

    expect(User.findOne).toHaveBeenCalledWith({ where: { id_usuario: 2, id_gimnasio: 7 } });
  });

  test('usuario inexistente: lanza error', async () => {
    User.findOne.mockResolvedValue(null);

    await expect(authService.deleteUser(7, 999, 1))
      .rejects.toThrow('Usuario no encontrado');
  });

  test('recepcion: borra sin contar admins', async () => {
    const user = fakeUser({ id_usuario: 2, rol: 'recepcion' });
    User.findOne.mockResolvedValue(user);

    await authService.deleteUser(7, 2, 1);

    expect(User.count).not.toHaveBeenCalled();
    expect(user.destroy).toHaveBeenCalled();
  });

  test('anti-lockout: no podés eliminar al único admin del gimnasio', async () => {
    const admin = fakeUser({ id_usuario: 2, rol: 'admin' });
    User.findOne.mockResolvedValue(admin);
    User.count.mockResolvedValue(1); // es el único admin

    await expect(authService.deleteUser(7, 2, 1))
      .rejects.toThrow('No puedes eliminar al único administrador del gimnasio');
    expect(admin.destroy).not.toHaveBeenCalled();
  });

  test('admin con otros admins presentes: sí se puede borrar', async () => {
    const admin = fakeUser({ id_usuario: 2, rol: 'admin' });
    User.findOne.mockResolvedValue(admin);
    User.count.mockResolvedValue(3); // hay más admins

    await authService.deleteUser(7, 2, 1);

    expect(admin.destroy).toHaveBeenCalled();
  });
});
