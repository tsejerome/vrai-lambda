import { Context } from 'koa';
import { validate, ValidatorOptions } from "class-validator";
import { plainToClass } from "class-transformer";


let validationTypes: string[] = [
  "body",
  "headers",
  "query",
  "params"
];

type CoreValidationResult = {
  hasError: true;
  error: {
    status: number;
    code: string;
    message: string;
    metadata?: any
  }
} | { hasError: false }

const coreValidation = async (ctx: Context, next: any, validationType: any, references: any, extraValidatingOptions: ValidatorOptions = {}): Promise<CoreValidationResult> => {
  if (!validationTypes.includes(validationType)) {

  }
  let referenceClass = null;

  switch (validationType) {
    case "body": {
      referenceClass = plainToClass(references, ctx.request.body);
      break;
    }
    case "headers": {
      referenceClass = plainToClass(references, ctx.request.headers);
      break;
    }
    case "query": {
      referenceClass = plainToClass(references, ctx.request.query);
      break;
    }

    case "params": {
      referenceClass = plainToClass(references, ctx.params);
      break;
    }
    default: {
      const error = {
        status: 500,
        code: 'validation_mismatch',
        message: validationType + 'is not a correct validation type',
      }
      ctx.throwHttpError(error);
      return { hasError: true, error }
    }
  }
  let options = { skipMissingProperties: true };
  Object.assign(options, extraValidatingOptions)
  const errors = await validate(referenceClass as any, options);
  if (errors.length > 0) {
    let errorTexts = Array();
    for (const errorItem of errors) {
      errorTexts = errorTexts.concat(errorItem.constraints);
    }
    let message: any = "";
    for (const [key, value] of Object.entries(errorTexts[0])) {
      message = value;
    }
    return {
      hasError: true,
      error: {
        status: 422,
        code: 'param__mismatch',
        message: message,
        metadata: errorTexts
      }
    }
  }
  return { hasError: false }
}

export { coreValidation };