export interface ErrorDetail {
	path?: string | number;
	message: string;
}

export class ApiError extends Error {
	statusCode: number;
	errors: ErrorDetail[];
	success: boolean;

	constructor(
		statusCode: number,
		message: string = "Something went wrong",
		errors: ErrorDetail[] = [],
		stack: string = "",
	) {
		super(message);
		this.statusCode = statusCode;
		this.errors = errors;
		this.success = false;

		if (stack) {
			this.stack = stack;
		} else {
			Error.captureStackTrace(this, this.constructor);
		}
	}
}

