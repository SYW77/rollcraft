// 간단한 이벤트 버스. 담당: 최수정

/** @returns {{ on(name: string, fn: Function): () => void, emit(name: string, payload?: any): void }} */
export function createEmitter() {
  /** @type {Map<string, Set<Function>>} */
  const handlers = new Map();

  return {
    on(name, fn) {
      if (!handlers.has(name)) handlers.set(name, new Set());
      handlers.get(name).add(fn);
      return () => handlers.get(name)?.delete(fn); // 구독 해제 함수
    },
    emit(name, payload) {
      handlers.get(name)?.forEach((fn) => fn(payload));
    },
  };
}
