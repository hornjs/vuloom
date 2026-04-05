export function rethrowServerRouteBuildError(error: unknown): never {
  if (isAmbiguousServerRoutePatternError(error)) {
    const wrappedError = new Error(`Ambiguous server routes: ${error.message}`);

    Object.assign(wrappedError, {
      cause: error,
    });

    throw wrappedError;
  }

  throw error;
}

function isAmbiguousServerRoutePatternError(error: unknown): error is Error {
  return error instanceof Error && error.message.startsWith('Ambiguous route pattern "');
}
