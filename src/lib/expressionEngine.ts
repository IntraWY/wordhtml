import type { TemplateVariable } from "@/types";

type Token =
  | { type: "NUMBER"; value: number }
  | { type: "VARIABLE"; name: string }
  | { type: "OPERATOR"; op: "+" | "-" | "*" | "/" }
  | { type: "LPAREN" }
  | { type: "RPAREN" }
  | { type: "FUNCTION"; name: string }
  | { type: "ARG_COUNT"; count: number }
  | { type: "COMMA" };

const VAR_REF_REGEX = /^\{\{([A-Za-z_฀-๿][\w฀-๿_]*)\}\}/;
const NUMBER_REGEX = /^\d+(?:\.\d+)?/;
const FUNCTION_REGEX = /^(sum|count|avg|min|max)\b/i;
const OPERATOR_REGEX = /^[+\-*/]/;

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const str = expression.trim();

  while (i < str.length) {
    const substr = str.slice(i);

    // Skip whitespace
    if (/^\s/.test(substr)) {
      i++;
      continue;
    }

    // Variable reference
    const varMatch = substr.match(VAR_REF_REGEX);
    if (varMatch) {
      tokens.push({ type: "VARIABLE", name: varMatch[1] });
      i += varMatch[0].length;
      continue;
    }

    // Number
    const numMatch = substr.match(NUMBER_REGEX);
    if (numMatch) {
      tokens.push({ type: "NUMBER", value: parseFloat(numMatch[0]) });
      i += numMatch[0].length;
      continue;
    }

    // Function
    const funcMatch = substr.match(FUNCTION_REGEX);
    if (funcMatch) {
      tokens.push({ type: "FUNCTION", name: funcMatch[1].toLowerCase() });
      i += funcMatch[0].length;
      continue;
    }

    // Operator
    const opMatch = substr.match(OPERATOR_REGEX);
    if (opMatch) {
      tokens.push({ type: "OPERATOR", op: opMatch[0] as Token["op"] });
      i += 1;
      continue;
    }

    // Parentheses
    if (substr[0] === "(") {
      tokens.push({ type: "LPAREN" });
      i++;
      continue;
    }
    if (substr[0] === ")") {
      tokens.push({ type: "RPAREN" });
      i++;
      continue;
    }

    // Comma
    if (substr[0] === ",") {
      tokens.push({ type: "COMMA" });
      i++;
      continue;
    }

    // Unknown character — skip
    i++;
  }

  return tokens;
}

function precedence(op: string): number {
  if (op === "*" || op === "/") return 2;
  if (op === "+" || op === "-") return 1;
  return 0;
}

function toRPN(tokens: Token[]): Token[] {
  const output: Token[] = [];
  const stack: Token[] = [];
  const argCountStack: number[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    switch (token.type) {
      case "NUMBER":
      case "VARIABLE":
        output.push(token);
        break;
      case "FUNCTION":
        stack.push(token);
        break;
      case "COMMA":
        while (stack.length > 0 && stack[stack.length - 1].type !== "LPAREN") {
          output.push(stack.pop()!);
        }
        if (argCountStack.length > 0) {
          argCountStack[argCountStack.length - 1]++;
        }
        break;
      case "OPERATOR": {
        const p = precedence(token.op);
        while (
          stack.length > 0 &&
          stack[stack.length - 1].type === "OPERATOR" &&
          precedence((stack[stack.length - 1] as { type: "OPERATOR"; op: string }).op) >= p
        ) {
          output.push(stack.pop()!);
        }
        stack.push(token);
        break;
      }
      case "LPAREN": {
        stack.push(token);
        // If previous token was a function, start counting args
        const prev = tokens[i - 1];
        if (prev && prev.type === "FUNCTION") {
          argCountStack.push(1); // first argument
        }
        break;
      }
      case "RPAREN":
        while (stack.length > 0 && stack[stack.length - 1].type !== "LPAREN") {
          output.push(stack.pop()!);
        }
        // Pop the LPAREN
        if (stack.length > 0 && stack[stack.length - 1].type === "LPAREN") {
          stack.pop();
        }
        // If function is on top, pop it to output with arg count
        if (stack.length > 0 && stack[stack.length - 1].type === "FUNCTION") {
          const func = stack.pop()!;
          const argCount = argCountStack.pop() || 1;
          output.push({ type: "ARG_COUNT", count: argCount });
          output.push(func);
        }
        break;
    }
  }

  while (stack.length > 0) {
    output.push(stack.pop()!);
  }

  return output;
}

function evaluateRPN(
  rpn: Token[],
  context: Record<string, string>
): number {
  const stack: number[] = [];

  const getValue = (name: string): number => {
    const val = context[name];
    if (val === undefined || val === null) return 0;
    const num = parseFloat(String(val).replace(/,/g, ""));
    return Number.isNaN(num) ? 0 : num;
  };

  for (const token of rpn) {
    switch (token.type) {
      case "NUMBER":
        stack.push(token.value);
        break;
      case "VARIABLE":
        stack.push(getValue(token.name));
        break;
      case "OPERATOR": {
        const b = stack.pop() ?? 0;
        const a = stack.pop() ?? 0;
        switch (token.op) {
          case "+":
            stack.push(a + b);
            break;
          case "-":
            stack.push(a - b);
            break;
          case "*":
            stack.push(a * b);
            break;
          case "/":
            stack.push(b === 0 ? 0 : a / b);
            break;
        }
        break;
      }
      case "ARG_COUNT":
        // Arg count is consumed by the following FUNCTION token
        stack.push(token.count);
        break;
      case "FUNCTION": {
        // Pop arg count, then args
        const argCount = stack.pop() ?? 0;
        const args: number[] = [];
        for (let i = 0; i < argCount; i++) {
          args.unshift(stack.pop() ?? 0);
        }
        switch (token.name) {
          case "sum":
            stack.push(args.reduce((a, b) => a + b, 0));
            break;
          case "count":
            stack.push(args.length);
            break;
          case "avg":
            stack.push(args.length > 0 ? args.reduce((a, b) => a + b, 0) / args.length : 0);
            break;
          case "min":
            stack.push(args.length > 0 ? Math.min(...args) : 0);
            break;
          case "max":
            stack.push(args.length > 0 ? Math.max(...args) : 0);
            break;
          default:
            stack.push(0);
        }
        break;
      }
      default:
        break;
    }
  }

  const raw = stack.length > 0 ? stack[stack.length - 1] : 0;
  // Clean up floating-point artifacts (e.g. 210.00000000000003)
  return parseFloat(raw.toFixed(10));
}

/**
 * Extract variable names referenced in an expression.
 */
export function extractReferences(expression: string): string[] {
  const tokens = tokenize(expression);
  const refs = new Set<string>();
  for (const t of tokens) {
    if (t.type === "VARIABLE") refs.add(t.name);
  }
  return Array.from(refs);
}

/**
 * Detect cycles in computed variable dependencies.
 * Returns the name of variables involved in a cycle, or null if no cycle.
 */
export function detectCycle(variables: TemplateVariable[]): string[] | null {
  const computedVars = variables.filter((v) => v.isComputed && v.expression);
  const graph = new Map<string, string[]>();

  for (const v of computedVars) {
    graph.set(v.name, extractReferences(v.expression!));
  }

  const visited = new Set<string>();
  const recStack = new Set<string>();

  function dfs(node: string, path: string[]): string[] | null {
    visited.add(node);
    recStack.add(node);
    path.push(node);

    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      if (!graph.has(neighbor)) continue; // not a computed variable
      if (!visited.has(neighbor)) {
        const cycle = dfs(neighbor, path);
        if (cycle) return cycle;
      } else if (recStack.has(neighbor)) {
        // Found cycle — return the cycle path
        const idx = path.indexOf(neighbor);
        return path.slice(idx);
      }
    }

    path.pop();
    recStack.delete(node);
    return null;
  }

  for (const v of computedVars) {
    if (!visited.has(v.name)) {
      const cycle = dfs(v.name, []);
      if (cycle) return cycle;
    }
  }

  return null;
}

/**
 * Evaluate a single expression with a given context of variable values.
 */
export function evaluateExpression(
  expression: string,
  context: Record<string, string>
): number {
  const tokens = tokenize(expression);
  const rpn = toRPN(tokens);
  return evaluateRPN(rpn, context);
}

/**
 * Evaluate all computed variables in dependency order.
 * Returns a map of variable name → computed string value.
 */
export function evaluateComputeds(
  variables: TemplateVariable[]
): { values: Record<string, string>; errors: Record<string, string> } {
  const result: Record<string, string> = {};
  const errors: Record<string, string> = {};

  // Start with raw values from non-computed variables
  for (const v of variables) {
    if (!v.isComputed) {
      result[v.name] = v.value;
    }
  }

  const computedVars = variables.filter((v) => v.isComputed && v.expression);
  if (computedVars.length === 0) return { values: result, errors };

  // Detect cycles
  const cycle = detectCycle(variables);
  if (cycle) {
    for (const v of computedVars) {
      errors[v.name] = `Cycle detected: ${cycle.join(" → ")}`;
    }
    return { values: result, errors };
  }

  // Build dependency graph and compute in topological order
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const v of computedVars) {
    inDegree.set(v.name, 0);
    dependents.set(v.name, []);
  }

  for (const v of computedVars) {
    const refs = extractReferences(v.expression!);
    for (const ref of refs) {
      const refVar = computedVars.find((cv) => cv.name === ref);
      if (refVar) {
        inDegree.set(v.name, (inDegree.get(v.name) || 0) + 1);
        dependents.set(ref, [...(dependents.get(ref) || []), v.name]);
      }
    }
  }

  // Kahn's algorithm
  const queue: string[] = [];
  for (const [name, degree] of inDegree) {
    if (degree === 0) queue.push(name);
  }

  let processed = 0;
  while (queue.length > 0) {
    const name = queue.shift()!;
    const variable = computedVars.find((v) => v.name === name)!;

    try {
      const value = evaluateExpression(variable.expression!, result);
      result[name] = String(value);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Evaluation error";
      errors[name] = msg;
      result[name] = "#ERROR";
    }

    processed++;

    for (const dependent of dependents.get(name) || []) {
      const newDegree = (inDegree.get(dependent) || 0) - 1;
      inDegree.set(dependent, newDegree);
      if (newDegree === 0) queue.push(dependent);
    }
  }

  if (processed !== computedVars.length) {
    // Should not happen if cycle detection passed, but just in case
    for (const v of computedVars) {
      if (!(v.name in result)) {
        errors[v.name] = "Could not evaluate (dependency issue)";
        result[v.name] = "#ERROR";
      }
    }
  }

  return { values: result, errors };
}
