- will it fail if 3rd log arg if empty object?
current theory = yes, because there is no way to know. 
current action = assume that is an additional.
- write that additional (in case it is outside the "params" as 3rd arg) should not have the same properties that params has if it has only these params
because in that case it will be assumes as "params" object. this can averted by passing additional as empty object on 4th arg.   
- remove debug statements