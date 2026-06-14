export class EmptyPoolError extends Error {
  public constructor(public readonly poolName: string) {
    super(`Cannot pick from empty pool: ${poolName}`)
    this.name = "EmptyPoolError"
  }
}

export class MissingRootError extends Error {
  public constructor() {
    super("React root element was not found")
    this.name = "MissingRootError"
  }
}
