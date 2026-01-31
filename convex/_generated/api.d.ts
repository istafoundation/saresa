/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as childAuth from "../childAuth.js";
import type * as content from "../content.js";
import type * as contentMigration from "../contentMigration.js";
import type * as couponActions from "../couponActions.js";
import type * as coupons from "../coupons.js";
import type * as crons from "../crons.js";
import type * as gameStats from "../gameStats.js";
import type * as http from "../http.js";
import type * as levels from "../levels.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_dates from "../lib/dates.js";
import type * as lib_levels from "../lib/levels.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as lib_razorpay from "../lib/razorpay.js";
import type * as parents from "../parents.js";
import type * as settings from "../settings.js";
import type * as spices from "../spices.js";
import type * as subscriptionActions from "../subscriptionActions.js";
import type * as subscriptions from "../subscriptions.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  childAuth: typeof childAuth;
  content: typeof content;
  contentMigration: typeof contentMigration;
  couponActions: typeof couponActions;
  coupons: typeof coupons;
  crons: typeof crons;
  gameStats: typeof gameStats;
  http: typeof http;
  levels: typeof levels;
  "lib/auth": typeof lib_auth;
  "lib/dates": typeof lib_dates;
  "lib/levels": typeof lib_levels;
  "lib/rateLimit": typeof lib_rateLimit;
  "lib/razorpay": typeof lib_razorpay;
  parents: typeof parents;
  settings: typeof settings;
  spices: typeof spices;
  subscriptionActions: typeof subscriptionActions;
  subscriptions: typeof subscriptions;
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
