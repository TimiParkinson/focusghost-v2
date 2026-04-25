<script lang="ts">
  import { AlertTriangle } from 'lucide-svelte';
  import { pendingStuck, appendChat } from '../stores';

  let text = $state('');
  let busy = $state(false);

  async function submit(): Promise<void> {
    if (!text.trim()) return;
    busy = true;
    appendChat({ id: `sp_${Date.now()}`, variant: 'stuck-prompt', text, timestamp: Date.now() });
    await window.api.submitStuck(text);
    text = '';
    busy = false;
    pendingStuck.set(null);
  }
</script>

{#if $pendingStuck}
  <div
    class="card mb-3"
    data-testid="stuck-card"
    style="border-color: #F59E0B; border-width: 1px"
  >
    <div class="flex items-center gap-2 mb-2">
      <AlertTriangle size={16} color="#F59E0B" />
      <div class="label" style="color: #F59E0B">
        NOTICED YOU&apos;VE BEEN ON THE SAME PROBLEM FOR A WHILE
      </div>
    </div>
    <div class="text-sm mb-3">What are you having trouble with?</div>
    <input
      data-testid="stuck-input"
      class="w-full bg-ink-700 border border-white/10 rounded-md px-3 py-2 text-sm outline-none focus:border-white/30"
      placeholder="e.g., understanding recursion in this function"
      bind:value={text}
      onkeydown={(e) => e.key === 'Enter' && submit()}
      disabled={busy}
    />
    <div class="flex gap-2 mt-3">
      <button
        class="btn btn-primary !py-1.5"
        onclick={submit}
        disabled={busy || !text.trim()}
        data-testid="btn-stuck-submit"
      >
        {busy ? 'Thinking…' : 'Get Unstuck Suggestion'}
      </button>
      <button
        class="btn-ghost btn !py-1.5"
        onclick={() => pendingStuck.set(null)}
        data-testid="btn-stuck-cancel"
      >
        Dismiss
      </button>
    </div>
  </div>
{/if}
