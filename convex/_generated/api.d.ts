/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auth from "../auth.js";
import type * as claudeDocumentProcessing from "../claudeDocumentProcessing.js";
import type * as documentProcessing from "../documentProcessing.js";
import type * as files from "../files.js";
import type * as functions from "../functions.js";
import type * as seedData from "../seedData.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  claudeDocumentProcessing: typeof claudeDocumentProcessing;
  documentProcessing: typeof documentProcessing;
  files: typeof files;
  functions: typeof functions;
  seedData: typeof seedData;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
