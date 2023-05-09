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

Many maybe-related and unrelated changes:
