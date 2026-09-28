/**
 * Fix for @react-three/fiber v9 + @types/react 19 JSX collapse.
 *
 * fiber augments `react/jsx-runtime` / `react/jsx-dev-runtime` with a shadowing
 * `namespace JSX`. React 19's runtimes only re-export JSX from `react`, so that
 * shadow becomes incomplete and the `react-jsx` transform resolves intrinsics
 * against it, collapsing every HTML element to `never` project-wide. Mirroring
 * React's complete JSX namespace into a global `JSX` (which React 19 no longer
 * provides) restores HTML while keeping fiber's three.js elements.
 *
 * Note: `React.ElementType` spots that render polymorphic/icon components are
 * fixed at the call site (typed concretely) rather than here, because the three
 * elements legitimately widen the intrinsic union for the general string case.
 */
import type * as React from "react";

declare global {
  namespace JSX {
    type ElementType = React.JSX.ElementType;
    interface Element extends React.JSX.Element {}
    interface ElementClass extends React.JSX.ElementClass {}
    interface ElementAttributesProperty extends React.JSX.ElementAttributesProperty {}
    interface ElementChildrenAttribute extends React.JSX.ElementChildrenAttribute {}
    type LibraryManagedAttributes<C, P> = React.JSX.LibraryManagedAttributes<C, P>;
    interface IntrinsicAttributes extends React.JSX.IntrinsicAttributes {}
    interface IntrinsicClassAttributes<T> extends React.JSX.IntrinsicClassAttributes<T> {}
    interface IntrinsicElements extends React.JSX.IntrinsicElements {}
  }
}

declare module "react/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements extends React.JSX.IntrinsicElements {}
  }
}

declare module "react/jsx-dev-runtime" {
  namespace JSX {
    interface IntrinsicElements extends React.JSX.IntrinsicElements {}
  }
}
