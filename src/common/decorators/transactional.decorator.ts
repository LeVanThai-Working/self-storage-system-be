import mongoose, { type ClientSession } from 'mongoose';

/**
 * @Transactional() Method Decorator
 * Tự động bọc toàn bộ logic của hàm trong một Database Transaction (Mongoose Session).
 * Tự động Commit khi thành công và Rollback nếu có bất kỳ lỗi/exception nào xảy ra.
 */
export function Transactional() {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const session: ClientSession = await mongoose.startSession();
      try {
        let result: unknown;
        await session.withTransaction(async () => {
          result = await originalMethod.apply(this, [...args, session]);
        });
        return result;
      } catch (error: unknown) {
        // Fallback cho môi trường MongoDB standalone (không bật replica set)
        const errMessage = error instanceof Error ? error.message : '';
        if (
          errMessage.includes('replica set member') ||
          errMessage.includes(
            'Transaction numbers are only allowed on a replica set'
          )
        ) {
          return await originalMethod.apply(this, args);
        }
        throw error;
      } finally {
        await session.endSession();
      }
    };

    return descriptor;
  };
}
