type InnerResult<T, TError> = { type: 'success'; value: T } | { type: 'error'; error: TError };

export type Results<Ts extends [any, any][]> = {
  [P in keyof Ts]: Ts[P] extends infer U ? (U extends [any, any] ? Result<U[0], U[1]> : never) : never;
};

export class Result<T, TError> {
  static ofValue<T, TError>(value: T): Result<T, TError> {
    return new Result<T, TError>({ type: 'success', value });
  }

  static ofError<T, TError>(error: TError): Result<T, TError> {
    return new Result<T, TError>({ type: 'error', error });
  }

  static concat2<T, TError, U, UError>(
    result0: Result<T, TError>,
    result1: Result<U, UError>,
  ): Result<[T, U], TError | UError> {
    return result0.flatMap((value0) => result1.map((value1) => [value0, value1]));
  }

  static concat3<T, TError, U, UError, V, VError>(
    result0: Result<T, TError>,
    result1: Result<U, UError>,
    result2: Result<V, VError>,
  ): Result<[T, U, V], TError | UError | VError> {
    return result0.flatMap((value0) => result1.flatMap((value1) => result2.map((value2) => [value0, value1, value2])));
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

  flatMap<U, UError>(f: (value: T) => Result<U, UError>): Result<U, UError | TError> {
    return this.match(
      (value) => f(value),
      (error) => Result.ofError<U, UError | TError>(error),
    );
  }

  validate<UError>(isValid: (value: T) => boolean, error: UError): Result<T, TError | UError> {
    return this.flatMap((value) => (isValid(value) ? this : Result.ofError<T, TError | UError>(error)));
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
