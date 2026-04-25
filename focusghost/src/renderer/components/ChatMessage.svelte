<script lang="ts">
  import type { ChatMessage } from '../../shared/types';
  import Ghost from './Ghost.svelte';

  interface Props {
    msg: ChatMessage;
    onAccept?: () => void;
    onDismiss?: () => void;
  }

  let { msg, onAccept, onDismiss }: Props = $props();

  function timeStr(ts: number): string {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
</script>

{#if msg.variant === 'user'}
  <div class="flex justify-end" data-testid="msg-{msg.id}">
    <div class="max-w-[78%] card !p-3 accent-bg-dim">
      <div class="text-sm whitespace-pre-wrap">{msg.text}</div>
      <div class="text-[10px] mt-1 opacity-70">{timeStr(msg.timestamp)}</div>
    </div>
  </div>
{:else if msg.variant === 'pattern'}
  <div class="card border-l-2" style="border-left-color: #F59E0B" data-testid="msg-{msg.id}">
    <div class="label" style="color: #F59E0B">PATTERN NOTICED</div>
    <div class="text-sm mt-1 whitespace-pre-wrap">{msg.text}</div>
    <div class="text-[10px] mt-1 opacity-70">{timeStr(msg.timestamp)}</div>
  </div>
{:else if msg.variant === 'stuck-prompt'}
  <div class="flex justify-end" data-testid="msg-{msg.id}">
    <div class="max-w-[78%] card !p-3" style="border-color: #F59E0B">
      <div class="label" style="color: #F59E0B">YOU SAID</div>
      <div class="text-sm mt-1 whitespace-pre-wrap">{msg.text}</div>
    </div>
  </div>
{:else if msg.variant === 'stuck-response'}
  <div class="flex gap-2 items-start" data-testid="msg-{msg.id}">
    <Ghost size={32} />
    <div class="card flex-1" style="border-color: #F59E0B">
      <div class="label" style="color: #F59E0B">UNSTUCK SUGGESTION</div>
      <pre class="text-sm mt-2 whitespace-pre-wrap font-sans leading-relaxed">{msg.text}</pre>
      <div class="flex gap-2 mt-3">
        <button class="btn !py-1.5" data-testid="btn-stuck-helped">Yes, helped</button>
        <button class="btn-ghost btn !py-1.5" data-testid="btn-stuck-still">Still stuck</button>
      </div>
    </div>
  </div>
{:else if msg.variant === 'nudge'}
  <div class="flex gap-2 items-start" data-testid="msg-{msg.id}">
    <Ghost size={32} />
    <div class="card flex-1 accent-border" style="border-width: 1px">
      <div class="label accent-text">NUDGE</div>
      <div class="text-sm mt-1 whitespace-pre-wrap">{msg.text}</div>
      {#if onAccept || onDismiss}
        <div class="flex gap-2 mt-3">
          {#if onAccept}
            <button class="btn btn-primary !py-1.5" onclick={onAccept} data-testid="btn-nudge-accept">
              On it
            </button>
          {/if}
          {#if onDismiss}
            <button class="btn-ghost btn !py-1.5" onclick={onDismiss} data-testid="btn-nudge-dismiss">
              Not now
            </button>
          {/if}
        </div>
      {/if}
      <div class="text-[10px] mt-2 opacity-70">{timeStr(msg.timestamp)}</div>
    </div>
  </div>
{:else}
  <div class="flex gap-2 items-start" data-testid="msg-{msg.id}">
    <Ghost size={32} />
    <div class="card flex-1">
      <div class="text-sm whitespace-pre-wrap">{msg.text}</div>
      <div class="text-[10px] mt-1 opacity-70">{timeStr(msg.timestamp)}</div>
    </div>
  </div>
{/if}
