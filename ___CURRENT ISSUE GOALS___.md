- [X] now able to pass "additinal" data as a 3rd argument, instead of passing it to "params"
- [ ] new logic and corresponding tests:
> - [X] is 4th arg defined (it can only be an object)?
> - yes → it is "params", 3rd arg is "additional" (see test @ :225)
> - no → next step. 
>
> - [x] is 3rd arg is an object?
> - no → it is "additional" (see test @ :225)
> - yes → next step.
>
> - [x] is 3rd arg (object) is empty?
> - yes → it is "additional" (see test @ :192)
> - no → next step.
>
> - [x] does 3rd arg (object) have any or all properties that "props" can have (only by name), and no others?
> - no → it is "additional" (see test @ :503)
> - yes → it is "props" (see test @ :503)
>
> ---
>
> - [ ] lightly tested aliases like `logInfo` 
> 

- [x] main script now has debug messages that are useful when something goes wrong, because doing the dubug on the injected script is a little problematic. these statements are working only in tests, in prod they are there, but noop'ed. i have refactored them a few times already, but last refactor came after the tests were written, so there is some chance i've got them a little wrong and they will need to be refactored again later.

- [ ] docs