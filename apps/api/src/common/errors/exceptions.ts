import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { ErrorCode } from './error-code.js';

export class PropertyNotDraftException extends ConflictException {
  constructor() {
    super('Property is no longer a draft', {
      errorCode: ErrorCode.INVALID_PROPERTY_STATUS,
    });
  }
}

export class PropertyNotPublishedException extends ConflictException {
  constructor() {
    super('Property is no longer published', {
      errorCode: ErrorCode.INVALID_PROPERTY_STATUS,
    });
  }
}

export class ConcurrentModificationException extends ConflictException {
  constructor() {
    super('Concurrent modification, please retry', {
      errorCode: ErrorCode.CONCURRENT_MODIFICATION,
    });
  }
}

export class PhotoLimitReachedException extends ConflictException {
  constructor() {
    super('Maximum 10 photos allowed', {
      errorCode: ErrorCode.PHOTO_LIMIT_REACHED,
    });
  }
}

export class PhotoUploadUnavailableException extends NotFoundException {
  constructor() {
    super('Photo upload not found, expired or already confirmed', {
      errorCode: ErrorCode.PHOTO_UPLOAD_UNAVAILABLE,
    });
  }
}

export class InvalidPhotoException extends UnprocessableEntityException {
  constructor(message: string) {
    super(message, { errorCode: ErrorCode.INVALID_PHOTO });
  }
}

export class PropertyIncompleteException extends UnprocessableEntityException {
  constructor(invalidFields: string[]) {
    super(
      { message: 'Property has incomplete or invalid fields', invalidFields },
      { errorCode: ErrorCode.PROPERTY_INCOMPLETE },
    );
  }
}

export class PhotoRequiredException extends UnprocessableEntityException {
  constructor() {
    super('At least one confirmed photo is required', {
      errorCode: ErrorCode.PHOTO_REQUIRED,
    });
  }
}
