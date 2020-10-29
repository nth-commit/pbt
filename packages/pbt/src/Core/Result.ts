type InnerResult<T, TError> = { type: 'success'; value: T } | { type: 'error'; error: TError };

export class Result<T, TError> {
  static ofValue<T, TError>(value: T): Result<T, TError> {
    return new Result<T, TError>({ type: 'success', value });
  }

  static ofError<T, TError>(error: TError): Result<T, TError> {
    return new Result<T, TError>({ type: 'error', error });
  }

  private constructor(private inner: InnerResult<T, TError>) {}

  match<U>(successFn: (value: T) => U, errorFn: (error: TError) => U): U {
    return this.inner.type === 'success' ? successFn(this.inner.value) : errorFn(this.inner.error);
  }

  map<U>(f: (value: T) => U): Result<U, TError> {
    return this.match(
      (value) => Result.ofValue<U, TError>(f(value)),
      (error) => Result.ofError<U, TError>(error),
    );
  }

  mapError<UError>(f: (error: TError) => UError): Result<T, UError> {
    return this.match(
      (value) => Result.ofValue<T, UError>(value),
      (error) => Result.ofError<T, UError>(f(error)),
    );
  }

  flatten(): T | TError {
    return this.match<T | TError>(
      (x) => x,
      (x) => x,
    );
  }

  asOk(makeThrowable: (error: TError) => Error): T {
    return this.match<T>(
      (value) => value,
      (error) => {
        throw makeThrowable(error);
      },
    );
  }
}
