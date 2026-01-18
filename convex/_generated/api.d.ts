/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as childAuth from "../childAuth.js";
import type * as content from "../content.js";
import type * as contentMigration from "../contentMigration.js";
import type * as crons from "../crons.js";
import type * as gameStats from "../gameStats.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_dates from "../lib/dates.js";
import type * as migrations from "../migrations.js";
import type * as parents from "../parents.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  childAuth: typeof childAuth;
  content: typeof content;
  contentMigration: typeof contentMigration;
  crons: typeof crons;
  gameStats: typeof gameStats;
  "lib/auth": typeof lib_auth;
  "lib/dates": typeof lib_dates;
  migrations: typeof migrations;
  parents: typeof parents;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
