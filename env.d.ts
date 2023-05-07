declare global {
    namespace NodeJS {
        interface ProcessEnv {
            /** indicates whether or not is to collect coverage
             */
            COVERAGE: boolean,
            /** indicates whether or not this is a CI environment
             */
            CI: boolean
        }
    }
}
export { };
