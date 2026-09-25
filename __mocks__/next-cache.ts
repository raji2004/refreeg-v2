export const revalidatePath = jest.fn();
export const revalidateTag = jest.fn();
export const unstable_cache = <T extends (...args: any[]) => any>(fn: T) => fn;
