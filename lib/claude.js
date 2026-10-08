// Thin wrapper around the Anthropic SDK: one configured client, one streaming
// call helper (streaming keeps long research turns clear of HTTP timeouts), and
// usage accounting. Server-side refusal fallbacks are enabled by default
// (FALLBACKS=off disables them).
import Anthropic from '@anthropic-ai/sdk';

export const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5-5';
export const EFFORT = process.env.RESEARCH_EFFORT || 'high';          // low | medium | high | xhigh | max
const FALLBACKS = String(process.env.FALLBACKS || 'on').toLowerCase() !== 'off';

let client = null;
export function getClient() {
  if (!client) client = new Anthropic({ timeout: 20 * 60 * 1000, maxRetries: 3 });
  return client;
}

export function isLive() {
  const demo = String(process.env.DEMO_MODE).toLowerCase() === 'true';
  return !demo && !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export function emptyUsage() {
  return { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, web_searches: 0, web_fetches: 0, requests: 0 };
}

export function addUsage(total, u) {
  if (!u) return total;
  total.requests += 1;
  total.input_tokens += u.input_tokens || 0;
  total.output_tokens += u.output_tokens || 0;
  total.cache_read_input_tokens += u.cache_read_input_tokens || 0;
  total.cache_creation_input_tokens += u.cache_creation_input_tokens || 0;
  total.web_searches += u.server_tool_use?.web_search_requests || 0;
  total.web_fetches += u.server_tool_use?.web_fetch_requests || 0;
  return total;
}

/**
 * One streamed Messages call. Returns the final message.
 * @param {object} o
 * @param {string} o.system          stable system prompt (cached)
 * @param {Array}  o.messages        conversation so far
 * @param {Array}  [o.tools]
 * @param {number} [o.maxTokens]
 * @param {string} [o.effort]
 * @param {object} [o.format]        structured-output JSON schema format
 * @param {(t:string)=>void} [o.onText]   streamed text deltas
 * @param {(n:string)=>void} [o.onTool]   tool name when a tool block starts
 */
export async function callClaude({ system, messages, tools, maxTokens = 32000, effort = EFFORT, format, onText, onTool, signal }) {
  const c = getClient();
  const params = {
    model: MODEL,
    max_tokens: maxTokens,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: withConversationBreakpoint(messages),
    output_config: { effort, ...(format ? { format } : {}) },
  };
  if (tools && tools.length) params.tools = tools;
  if (FALLBACKS) { params.betas = ['server-side-fallback-2026-07-01']; params.fallbacks = 'default'; }

  const stream = FALLBACKS
    ? c.beta.messages.stream(params, { signal })
    : c.messages.stream(params, { signal });

  if (onText) stream.on('text', onText);
  if (onTool) {
    stream.on('streamEvent', (ev) => {
      if (ev.type === 'content_block_start') {
        const b = ev.content_block;
        if (b.type === 'tool_use' || b.type === 'server_tool_use') onTool(b.name, b);
      }
    });
  }
  const message = await stream.finalMessage();
  if (message.stop_reason === 'refusal') {
    const d = message.stop_details;
    throw new Error(`The model declined this request${d?.category ? ` (${d.category})` : ''}${d?.explanation ? `: ${d.explanation}` : '.'}`);
  }
  return message;
}

// Puts a cache breakpoint on the last block of the final message so the growing
// conversation (tool results, search results) is served from cache turn after turn.
function withConversationBreakpoint(messages) {
  if (!messages.length) return messages;
  const out = messages.map(m => {
    if (typeof m.content !== 'string') return m;
    return { ...m, content: [{ type: 'text', text: m.content }] };
  });
  const last = out[out.length - 1];
  const blocks = last.content.map(b => ({ ...b }));
  const tail = blocks[blocks.length - 1];
  if (tail && ['text', 'tool_result', 'tool_use', 'image', 'document'].includes(tail.type)) {
    tail.cache_control = { type: 'ephemeral' };
  }
  out[out.length - 1] = { ...last, content: blocks };
  return out;
}

export function textOf(message) {
  return (message?.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
}

export function isApiError(e) { return e instanceof Anthropic.APIError; }
export { Anthropic };
