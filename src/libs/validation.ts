import type { CreateItemRequest } from "@/types/item";

/**
 * Validation utilities for request parsing and validation
 *
 * This keeps validation logic centralized and reusable across handlers.
 */

export class ValidationUtils {
  /**
   * Parse and validate the request body for creating an item
   */
  static parseAndValidateCreateItemRequest(body: string | null): CreateItemRequest {
    if (!body) {
      throw new Error("Request body is required");
    }

    let requestData: CreateItemRequest;
    try {
      requestData = JSON.parse(body) as CreateItemRequest;
    } catch (_parseError) {
      console.warn("Invalid JSON in request body? Try to base64 decode it?");

      try {
        const decoded = Buffer.from(body, "base64");

        requestData = JSON.parse(decoded.toString());
      } catch (_e) {
        throw new Error("Invalid JSON in request body");
      }
    }

    if (!requestData.name) {
      throw new Error("Field 'name' is required");
    }

    return {
      name: requestData.name,
      description: requestData.description,
      category: requestData.category,
    };
  }

  /**
   * Validate that a required field is present
   */
  static validateRequiredField(value: any, fieldName: string): void {
    if (value === undefined || value === null || value === "") {
      throw new Error(`Field '${fieldName}' is required`);
    }
  }

  /**
   * Validate that a value is a valid string
   */
  static validateString(value: any, fieldName: string): string {
    if (typeof value !== "string") {
      throw new Error(`Field '${fieldName}' must be a string`);
    }
    return value;
  }

  /**
   * Validate that a value is a valid number
   */
  static validateNumber(value: any, fieldName: string): number {
    if (typeof value !== "number" || Number.isNaN(value)) {
      throw new Error(`Field '${fieldName}' must be a valid number`);
    }
    return value;
  }

  /**
   * Validate that a value is a valid positive integer
   */
  static validatePositiveInteger(value: any, fieldName: string): number {
    const num = ValidationUtils.validateNumber(value, fieldName);
    if (!Number.isInteger(num) || num <= 0) {
      throw new Error(`Field '${fieldName}' must be a positive integer`);
    }
    return num;
  }

  /**
   * Validate that a value is a valid email
   */
  static validateEmail(value: any, fieldName: string): string {
    const email = ValidationUtils.validateString(value, fieldName);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error(`Field '${fieldName}' must be a valid email address`);
    }
    return email;
  }

  /**
   * Validate that a value is one of the allowed options
   */
  static validateEnum<T>(value: any, fieldName: string, allowedValues: T[]): T {
    if (!allowedValues.includes(value)) {
      throw new Error(`Field '${fieldName}' must be one of: ${allowedValues.join(", ")}`);
    }
    return value;
  }

  /**
   * Validate that a value is within a specified length range
   */
  static validateStringLength(
    value: any,
    fieldName: string,
    minLength: number,
    maxLength: number,
  ): string {
    const str = ValidationUtils.validateString(value, fieldName);
    if (str.length < minLength || str.length > maxLength) {
      throw new Error(
        `Field '${fieldName}' must be between ${minLength} and ${maxLength} characters`,
      );
    }
    return str;
  }

  /**
   * Validate that a value is a valid UUID
   */
  static validateUUID(value: any, fieldName: string): string {
    const str = ValidationUtils.validateString(value, fieldName);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(str)) {
      throw new Error(`Field '${fieldName}' must be a valid UUID`);
    }
    return str;
  }

  /**
   * Validate that a value is a valid ISO date string
   */
  static validateISODate(value: any, fieldName: string): string {
    const str = ValidationUtils.validateString(value, fieldName);
    const date = new Date(str);
    if (Number.isNaN(date.getTime())) {
      throw new Error(`Field '${fieldName}' must be a valid ISO date string`);
    }
    return str;
  }
}
