export type UncertianResultSuccess<T> = {
    success: true,
    result: T
}
export type UncertianPromiseResultSuccess<T> = Promise<UncertianResultSuccess<T>>;

export type UncertianResultFailure = {
    success: false,
    reason?: any
}

export type UncertianPromiseResult<T> = Promise<UncertianResultSuccess<T> | UncertianResultFailure>;