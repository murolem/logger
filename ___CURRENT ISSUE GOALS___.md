- [X] now able to pass "additinal" data as a 3rd argument, instead of passing it to "params"
- [X] new logic and corresponding tests:
> - [X] is 4th arg defined (it can only be an object)?
> - yes → it is "params", 3rd arg is "additional" (see test @ :319)
> - no → next step. 
>
> - [x] is 3rd arg is an object?
> - no → it is "additional" (see test @ :319)
> - yes → next step.
>
> - [x] is 3rd arg (object) is empty?
> - yes → it is "additional" (see test @ :286)
> - no → next step.
>
> - [x] does 3rd arg (object) have any or all properties that "props" can have (only by name), and no others?
> - no → it is "additional" (see test @ :633)
> - yes → it is "props" (see test @ :589)
>
> ---
>
> - [X] lightly tested aliases like `logInfo`  — (see test @ :147)
>
> - [X] augmented some other tests to call the same log but with "additional" as 3rd arg instead of a property of "params"
> 

- [x] main script now has debug messages that are useful when something goes wrong, because doing the dubug on the injected script is a little problematic. these statements are working only in tests, in prod they are there, but noop'ed. i have refactored them a few times already, but last refactor came after the tests were written, so there is some chance i've got them a little wrong and they will need to be refactored again later.

- [X] docs

---

Many maybe-related and unrelated changes:
- renamed commands to run e2e tests on chromium: 
  - was `...:ch**or**rmium-only` and `...:chromium-only`
  - became `...:chromium` 
- added `contants.ts` file to `src` dir — this file now containts the `paramNames` const array with names of "params" properties
- add `types.ts` file to `src` dir — it is now containts all the types that were before in `src/index.ts`, but grown since this feature branch started.
- types of `log()` and aliases (such as `logInfo()`) are now separate because of overloads: these functions are lamda-functions because they dont lose context when destructured (they just keep it as it was) and cannot be overloads like regular functions.
- added utility functions:
  - `isObject()` — checks if value is object (that has props and stuff) and not null
  - `noop()` — a function that does nothing, used like a safe plug for some places.
  - `objectGetOwnOrFallback` — returns a property of an object if it has it or fallback value otherwise.
  - `doesObjectOnlyHaveSpecificProps` — checks if object has specified props and no others. has a few little fancy options.
- more path aliases
- a little cleanup of unused comments