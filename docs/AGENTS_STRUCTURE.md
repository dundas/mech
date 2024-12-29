# Agents Architecture and Framework

This document details a recommended approach for building agentic systems within our project, inspired by:

1. [Anthropic’s “Building Effective Agents”](https://www.anthropic.com/research/building-effective-agents)  
2. [OpenAI’s “Swarm” multi-agent orchestration](https://github.com/openai/swarm)

It also incorporates lessons from our own repo’s existing documentation.

---

## 1. Concepts from Anthropic’s Building Effective Agents

Anthropic’s document (Dec 19, 2024) breaks down agentic systems into building blocks and workflows. Here’s a quick summary:

1. Augmented LLM as the Base
   - Each agent is fundamentally an LLM that can use tools (APIs, retrieval, memory).
   - We recommend a minimal, composable approach: every agent call has access to only the capabilities it needs (retrieval, tool usage, etc.).

2. Workflows vs. Agents
   - Workflows: Predefined, predictable sequences of LLM calls/tools. Ideal when tasks are well-defined (e.g., prompt chaining, routing, parallelization).
   - Agents: More flexible, can dynamically decide which tools to invoke, in what order, and for how long. Suited for open-ended, adaptive tasks.

3. Common Patterns
   - Prompt Chaining  
   - Routing  
   - Parallelization  
   - Orchestrator-Workers  
   - Evaluator-Optimizer  
   - Fully Autonomous Agents

Each pattern ensures clarity on when we should escalate from a simple solution (single LLM calls) up to a more complex multi-step or multi-agent architecture.

---

## 2. Concepts from OpenAI’s Swarm

OpenAI’s [Swarm project](https://github.com/openai/swarm) is an experimental framework for multi-agent orchestration that uses:
- Lightweight abstractions like “Agent” objects.
- “Handoffs” from one agent to another.
- Routines and function-calling to keep the design minimal but flexible.

Key ideas we can borrow or reference:
1. Each agent has:
   - “instructions” (like a system prompt)  
   - A set of “functions” or tools it can call  
   - Possibly a “handoff” method to pass control to a different agent

2. A top-level “Swarm” or controller orchestrates calls, collects messages, and handles function calls or returns from multiple agents.

3. For maximum transparency, the design is intentionally minimal: it only introduces just enough complexity to enable multi-agent workflows while remaining easy to debug.

---

## 3. How This Fits Into Our Docs

We’ll extend our existing documentation in a way that embodies both Anthropic’s conceptual clarity and Swarm’s minimal orchestrations.

Below is our recommended folder and file structure changes to integrate these agentic concepts:

1. <code>docs/AGENTS_STRUCTURE.md</code> (this file)  
   - Explains overall agent architecture.  
   - References known patterns (workflow vs. agent).  
   - Summarizes how/why to escalate from single to multi-agent designs.

2. <code>docs/AGENTS_GUIDE.md</code> (future file, optional)  
   - Step-by-step tutorial for building a new agent or workflow.  
   - Code samples or minimal “hello-world” multi-agent example.

3. <code>docs/playbooks/</code>  
   - We can add a “multi-agent_setup.devin.md” to our existing playbooks.  
   - That playbook might walk you through scaffolding a minimal “Swarm-like” agent system or a multi-step “Anthropic-like” workflow in the codebase.

4. <code>/app/agents/</code> directory (if we go with that approach)  
   - Each agent’s “instructions”, “functions”, and “handoff” logic are placed here.  
   - Could have subdirectories for domain-specific or specialized agents.

5. <code>/app/api/agents/</code> (if building an Agents-as-a-Service model)  
   - Potential route to dispatch or interact with multiple agents from a single API call.  
   - Would demonstrate how the system orchestrates calls among them.

---

## 4. Recommended Steps to Implement Agents

1. Start Simple
   - Begin with single-call LLM usage. Ensure each call uses minimal prompts.
   - Add retrieval or tool usage only if necessary.

2. Add a Workflow
   - If the logic grows beyond a single call (e.g. prompt chaining or routing), implement a workflow.  
   - Keep the flow explicit: each step is a short system prompt plus messages.

3. Introduce an Agent
   - When a single workflow can’t handle the dynamic nature of tasks, create an agent.  
   - The agent decides how to invoke tools or sub-steps. This is where you might adopt a “Swarm-like” structure with function calls and handoffs.

4. Multi-Agent Orchestration
   - For tasks requiring specialized skills or concurrency, build multiple specialized agents.  
   - Provide each agent only the instructions and tools necessary.  
   - Add an orchestrator that can route tasks, divide them, reunify outputs (similar to an Orchestrator-Worker or Evaluator-Optimizer pattern).

5. Testing & Guardrails
   - Thoroughly test each step.  
   - If you adopt autonomy, consider limits (e.g. max steps) to keep costs predictable.  
   - Possibly incorporate evaluator-optimizer loops for reliability.

---

## 5. Example: Combining Anthropic Workflow + Swarm

Below is a simplified example of how we might define two agents and an orchestrator in a multi-step flow:

1. Orchestrator (system or top-level agent)  
   - Receives user request.  
   - Decides if it’s best handled directly or by specialized agents.  
   - If specialized handling is needed, “hands off” to one or more domain agents.  

2. Domain Agent A (e.g. “Sales Agent”)  
   - Has instructions around user requests for quotes, refunds, order data, etc.  
   - Tools: database queries, discount calculators.  
   - Returns its answer or “hands off” if it identifies further specialized tasks.

3. Domain Agent B (e.g. “Support Agent”)  
   - Has instructions around technical issues.  
   - Tools: knowledge base retrieval, triage checklists.  
   - Re-routes to Orchestrator if user changes the topic or specialist domain is needed.

In code, we might adapt a structure like Swarm’s (one main “Swarm” client, multiple “Agent” objects, plus function calls and optional agent returns). Please see:
- [Swarm’s “examples/airline”](https://github.com/openai/swarm/tree/main/examples/airline)
- [Anthropic’s recommended “orchestrator-workers” pattern](https://www.anthropic.com/research/building-effective-agents#workflows)

for more detailed demonstrations.

---

## 6. Future Enhancements and Further Reading

Future expansions might include:
1. **Evaluator-Optimizer Loops:** Where a second agent critiques each outcome before finalizing.  
2. **Autonomous Agents:** Using tool calls in a loop until a condition is met or a maximum iteration limit is reached.  
3. **Memory & Retrieval:** Storing conversation or knowledge base context for better continuity.  
4. **Parallelization:** Splitting tasks across multiple agents to reduce latency or gather multiple opinions.

For detailed guidance, see:
- Anthropic’s blog: [“Building Effective Agents”](https://www.anthropic.com/research/building-effective-agents)  
- OpenAI Swarm: [GitHub Repo](https://github.com/openai/swarm)  
- Our existing docs for [MongoDB schema](/docs/MONGODB_SCHEMA.md), [Chat Interface](/docs/CHAT_INTERFACE.md), and [UI Architecture](/docs/UI_ARCHITECTURE.md).

---

### Final Notes

• Keep it as simple as possible. Start with single-call solutions; only move to agent setups when genuinely beneficial.  
• Agent intentions and tool usage must be explicit. Clear instructions, safe tool boundaries, and effective debug logs are vital.  
• Combine the patterns (Anthropic’s workflows + Swarm’s orchestrations) that best fit your domain and requirements.  

We welcome further contributions to this doc. Feel free to open a pull request with additional examples, expansions, or clarifications! 