export class ApiResponse {
  /**
   * @param {number} statusCode HTTP status code
   * @param {string} message
   * @param {*} [data]
   * @param {object} [meta] e.g. pagination info
   */
  constructor(statusCode, message, data = null, meta = undefined) {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
    this.meta = meta;
  }

  send(res) {
    const body = {
      success: this.success,
      message: this.message,
      data: this.data,
    };
    if (this.meta !== undefined) body.meta = this.meta;

    return res.status(this.statusCode).json(body);
  }
}
