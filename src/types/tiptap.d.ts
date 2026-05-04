import "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    setSearchTerm: (term: string) => ReturnType;
    setReplaceTerm: (term: string) => ReturnType;
    resetIndex: () => ReturnType;
    nextMatch: () => ReturnType;
    previousMatch: () => ReturnType;
    replace: () => ReturnType;
    replaceAll: () => ReturnType;
  }
}
