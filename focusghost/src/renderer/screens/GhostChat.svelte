<script lang="ts">
  import { tick } from 'svelte';
  import { Send } from 'lucide-svelte';
  import { chat, chatBusy, pendingNudge, pendingStuck, appendChat } from '../stores';
  import ChatMessageView from '../components/ChatMessage.svelte';
  import StuckCard from '../components/StuckCard.svelte';

  let text = $state('');
  let scrollEl: HTMLDivElement;

  $effect(() => {
    // touch reactive deps to retrigger
    void $chat.length;
    void $pendingStuck;
    void $chatBusy;
    void tick().then(() => {
      if (scrollEl) scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: 'smooth' });
    });
  });

  async function send(): Promise<void> {
    if (!text.trim() || $chatBusy) return;
    const out = text.trim();
    appendChat({ id: `u_${Date.now()}`, variant: 'user', text: out, timestamp: Date.now() });
    text = '';
    chatBusy.set(true);
    try {
      await window.api.sendChat(out);
    } finally {
      setTimeout(() => chatBusy.set(false), 100);
    }
  }

  function ack(accept: boolean): void {
    if (!$pendingNudge) return;
    appendChat({
      id: `ack_${Date.now()}`,
      variant: 'system',
      text: accept ? 'Accepted nudge — back on it.' : 'Dismissed nudge.',
      timestamp: Date.now(),
    });
    pendingNudge.set(null);
  }
</script>

<div class="h-full flex flex-col" data-testid="screen-chat">
  <div bind:this={scrollEl} class="flex-1 overflow-y-auto px-4 py-3 space-y-3">
    {#if $pendingStuck}
      <StuckCard />
    {/if}
    {#if $chat.length === 0 && !$pendingStuck}
      <div class="text-center text-white/40 text-sm pt-12" data-testid="chat-empty">
        Ghost is here. Ask anything, or start a session to get nudges.
      </div>
    {/if}
    {#each $chat as m (m.id)}
      <ChatMessageView
        msg={m}
        onAccept={m.variant === 'nudge' && $pendingNudge?.id === m.id ? () => ack(true) : undefined}
        onDismiss={m.variant === 'nudge' && $pendingNudge?.id === m.id ? () => ack(false) : undefined}
      />
    {/each}
    {#if $chatBusy}
      <div class="text-xs text-white/40" data-testid="chat-loading">Ghost is thinking…</div>
    {/if}
  </div>
  <div class="border-t border-white/5 p-3 flex gap-2">
    <input
      data-testid="chat-input"
      class="flex-1 bg-ink-700 border border-white/10 rounded-md px-3 py-2 text-sm outline-none focus:border-white/30"
      placeholder="Talk to your ghost…"
      bind:value={text}
      onkeydown={(e) => e.key === 'Enter' && send()}
      disabled={$chatBusy}
    />
    <button
      class="btn btn-primary !p-2"
      data-testid="btn-chat-send"
      onclick={send}
      disabled={!text.trim() || $chatBusy}
    >
      <Send size={14} />
    </button>
  </div>
</div>
