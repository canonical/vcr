---
theme: default
title: Microcloud
info: |
  ## Canonical Microcloud
  Canonical Microcloud lesson 9
  Learn more at [Microcloud](https://canonical.com/microcloud)
class: text-center
# https://sli.dev/features/drawing
drawings:
  persist: false
# slide transition: https://sli.dev/guide/animations.html#slide-transitions
transition: slide-left
# enable Comark Syntax: https://comark.dev/syntax/markdown
comark: true
# duration of the presentation
duration: 35min
---

# Lesson 9

Preparing Nodes for MicroCloud

<!--
<div @click="$slidev.nav.next" class="mt-12 py-1" hover:bg="white op-10">
  Press Space for next page <carbon:arrow-right />
</div>

<div class="abs-br m-6 text-xl">
  <button @click="$slidev.nav.openInEditor()" title="Open in Editor" class="slidev-icon-btn">
    <carbon:edit />
  </button>
  <a href="https://github.com/slidevjs/slidev" target="_blank" class="slidev-icon-btn">
    <carbon:logo-github />
  </a>
</div>
-->
<!-- sli-speech:start hash=0b18b1e97157 format=wav -->
<audio class="sli-speech-track" src="./audio-cache/0b18b1e97157.wav" autoplay preload="auto"></audio>
<!-- sli-speech:source
PCEtLQpCZWZvcmUgd2UgaW5pdGlhbGlzZSB0aGUgY2x1c3Rlciwgd2UgbmVlZCB0byBwcmVwYXJlIGVhY2ggbm9kZS4KClRoZSBwcm9jZXNzIGhhcyBmb3VyIHN0ZXBzLgpGaXJzdCwgd2UgaW5zdGFsbCB0aGUgc25hcHMg4oCUIE1pY3JvQ2xvdWQsIExYRCwgTWljcm9DZXBoLCBhbmQgTWljcm9PVk4uClNlY29uZCwgd2UgbG9jayB0aGUgc25hcCB2ZXJzaW9ucyBzbyBldmVyeSBub2RlIHJ1bnMgdGhlIHNhbWUgcmVsZWFzZS4KVGhpcmQsIHdlIGNoZWNrIHRoZSBoYXJkd2FyZSDigJQgZGlza3MsIG5ldHdvcmsgaW50ZXJmYWNlcywgYW5kIG1lbW9yeS4KRm91cnRoIGFuZCBmaW5hbGx5LCB3ZSBydW4gYSBxdWljayBwcmUtZmxpZ2h0IGNoZWNrIHRvIG1ha2Ugc3VyZSBldmVyeXRoaW5nIGlzIHJlYWR5LgoKV2Ugd2lsbCBkbyB0aGlzIG9uIHRoZSBmaXJzdCBub2RlLCBtYy0wMS4gVGhlIHNhbWUgc3RlcHMgYXJlIHJlcGVhdGVkIG9uIG1jLTAyIGFuZCBtYy0wMyBpZGVudGljYWxseS4KLS0+
<!-- sli-speech:end -->

---
transition: fade-out
---

# Roadmap

<p v-click>
Steps to perform:
</p>

<div class="grid gap-3 mt-4 text-sm" style="grid-template-columns: repeat(3, 1fr) 1.5fr 1fr">
  <div v-after.up class="p-3 rounded border border-primary/40 bg-primary/10">
    <div class="font-mono text-xs opacity-60 mb-1">Install snaps</div>
    <div>
      <ul>
       <li>Microcloud</li>
       <li>LXD</li>
       <li>MicroCeph</li>
       <li>MicroOVN</li>
      </ul>
    </div>
  </div>
  <div v-click.after.up class="p-3 rounded border border-primary/40 bg-primary/15">
    <div class="font-mono text-xs opacity-60 mb-1">Lock Versions</div>
    <div>Ensure every node runs the exact same release by locking snap versions</div>
  </div>
  <div v-click.after.up class="p-3 rounded border border-primary/40 bg-primary/20">
    <div class="font-mono text-xs opacity-60 mb-1">Hardware check</div>
    <div>Verify disks, network interfaces, and memory are correctly configured</div>
  </div>
  <div v-click.after.up class="p-3 rounded border border-primary/40 bg-primary/25">
    <div class="font-mono text-xs opacity-60 mb-1">Preflight check</div>
    <div>Perform a final automated check to ensure system readiness</div>
  </div>
</div>

<div v-click mt-12>

Perform these steps on the first node, <span v-mark.red="6"> mc-01 </span>. Repeat identically on the other nodes, <span v-mark.circle.orange="7">  mc-02 and mc-03  </span>

</div>

<!-- sli-speech:start hash=0b18b1e97157 format=wav -->
<audio class="sli-speech-track" src="./audio-cache/0b18b1e97157.wav" autoplay preload="auto"></audio>
<!-- sli-speech:source
PCEtLQpCZWZvcmUgd2UgaW5pdGlhbGlzZSB0aGUgY2x1c3Rlciwgd2UgbmVlZCB0byBwcmVwYXJlIGVhY2ggbm9kZS4KClRoZSBwcm9jZXNzIGhhcyBmb3VyIHN0ZXBzLgpGaXJzdCwgd2UgaW5zdGFsbCB0aGUgc25hcHMg4oCUIE1pY3JvQ2xvdWQsIExYRCwgTWljcm9DZXBoLCBhbmQgTWljcm9PVk4uClNlY29uZCwgd2UgbG9jayB0aGUgc25hcCB2ZXJzaW9ucyBzbyBldmVyeSBub2RlIHJ1bnMgdGhlIHNhbWUgcmVsZWFzZS4KVGhpcmQsIHdlIGNoZWNrIHRoZSBoYXJkd2FyZSDigJQgZGlza3MsIG5ldHdvcmsgaW50ZXJmYWNlcywgYW5kIG1lbW9yeS4KRm91cnRoIGFuZCBmaW5hbGx5LCB3ZSBydW4gYSBxdWljayBwcmUtZmxpZ2h0IGNoZWNrIHRvIG1ha2Ugc3VyZSBldmVyeXRoaW5nIGlzIHJlYWR5LgoKV2Ugd2lsbCBkbyB0aGlzIG9uIHRoZSBmaXJzdCBub2RlLCBtYy0wMS4gVGhlIHNhbWUgc3RlcHMgYXJlIHJlcGVhdGVkIG9uIG1jLTAyIGFuZCBtYy0wMyBpZGVudGljYWxseS4KLS0+
<!-- sli-speech:end -->

---


# Installing the snaps

<p v-click>
We install snaps using the long-term support (LTS) channel for each component.
</p>

<div class="grid gap-3 mt-4 text-sm" style="grid-template-columns: repeat(3, 1fr) 1.5fr 1fr">
  <div v-after.up class="p-3 rounded border border-primary/40 bg-primary/10">
    <div class="font-mono text-xs opacity-60 mb-1">Microcloud</div>
    <div>
      <ul>
       <li>2/stable channel</li>
       <li>Current LTS track for MicroCloud.</li>
      </ul>
    </div>
  </div>
  <div v-click.after.up class="p-3 rounded border border-primary/40 bg-primary/15">
    <div class="font-mono text-xs opacity-60 mb-1">LXD</div>
    <div>
      <ul>
       <li>5.21/stable</li>
       <li>The LTS track for LXD</li>
      </ul>
    </div>
  </div>
  <div v-click.after.up class="p-3 rounded border border-primary/40 bg-primary/20">
    <div class="font-mono text-xs opacity-60 mb-1">Microceph</div>
    <div>
      <ul>
       <li>squid/stable</li>
       <li>Squid is the latest LTS Ceph release</li>
      </ul>
    </div>
  </div>
  <div v-click.after.up class="p-3 rounded border border-primary/40 bg-primary/25">
    <div class="font-mono text-xs opacity-60 mb-1">MicroOVN</div>
    <div>
      <ul>
       <li>24.03/stable</li>
       <li>Paired with the same Ubuntu release</li>
      </ul>
    </div>
  </div>
</div>
<div v-click mt-12>
Let's look at the installation command.
</div>

<!-- sli-speech:start hash=49e774a87c03 format=wav -->
<audio class="sli-speech-track" src="./audio-cache/49e774a87c03.wav" autoplay preload="auto"></audio>
<!-- sli-speech:source
PCEtLQpMZXQgdXMgbG9vayBhdCB0aGUgaW5zdGFsbGF0aW9uIGNvbW1hbmQuCgpXZSBpbnN0YWxsIGZvdXIgc25hcHMgdXNpbmcgdGhlIGxvbmctdGVybSBzdXBwb3J0IGNoYW5uZWwgZm9yIGVhY2ggY29tcG9uZW50OgotIE1pY3JvQ2xvdWQgb24gdGhlIDIvc3RhYmxlIGNoYW5uZWwsIHdoaWNoIGlzIHRoZSBjdXJyZW50IExUUyB0cmFjay4KLSBMWEQgb24gNS4yMS9zdGFibGUsIHRoZSBMVFMgdHJhY2sgZm9yIExYRC4KLSBNaWNyb0NlcGggb24gc3F1aWQvc3RhYmxlIOKAlCBTcXVpZCBpcyB0aGUgbGF0ZXN0IExUUyBDZXBoIHJlbGVhc2UuCi0gTWljcm9PVk4gb24gMjQuMDMvc3RhYmxlLCBwYWlyZWQgd2l0aCB0aGUgc2FtZSBVYnVudHUgcmVsZWFzZS4KClVzaW5nIExUUyBjaGFubmVscyBtZWFucyB0aGUgdmVyc2lvbnMgc3RheSBzdGFibGUgb3ZlciB0aW1lLiBUaGVyZSBhcmUgbm8gdW5leHBlY3RlZCBmZWF0dXJlIGNoYW5nZXMgZHVyaW5nIGEgZGVsaXZlcnkuCgpUaGUgaW5zdGFsbGF0aW9uIHRha2VzIGFib3V0IG9uZSBtaW51dGUgcGVyIHNuYXAuIE9uIHRoZSB0aHJlZSBub2RlcyB5b3Ugd291bGQgZG8gdGhpcyBpbiBwYXJhbGxlbCwgb3IgdGhyb3VnaCBhIGNvbmZpZ3VyYXRpb24gbWFuYWdlbWVudCB0b29sLgoKT25jZSBhbGwgZm91ciBhcmUgaW5zdGFsbGVkLCBjb25maXJtIHdpdGggYHNuYXAgbGlzdGAuCi0tPg==
<!-- sli-speech:end -->

---

# Locking snap versions

<p v-click>
After installing, we must prevent automatic updates to ensure consistency across MicroCloud components.
</p>

<div class="grid grid-cols-2 gap-3 mt-4 text-sm">
  <div v-after.up class="p-3 rounded border border-primary/40 bg-primary/10">
    <div class="font-mono text-xs opacity-60 mb-1">1. Use Cohort Keys</div>
    <div>
      <ul>
       <li>Install with --cohort="+" to pin all nodes to the same snap revision</li>
       <li>This prevents revision drifting even after future refreshes</li>
      </ul>
    </div>
  </div>
  <div v-click.after.up class="p-3 rounded border border-primary/40 bg-primary/15">
    <div class="font-mono text-xs opacity-60 mb-1">2. Hold Updates</div>
    <div>
      <ul>
       <li>Run snap hold to freeze all snaps at their current version</li>
       <li>Automatic updates are suspended until you explicitly unhold and refresh</li>
      </ul>
    </div>
  </div>
</div>
<div v-click mt-12>
<b>Verification</b>: Run <tt>snap list</tt> on every node. They should show identical versions, revisions, and channels.
</div>

<!-- sli-speech:start hash=3dce7a686d64 format=wav -->
<audio class="sli-speech-track" src="./audio-cache/3dce7a686d64.wav" autoplay preload="auto"></audio>
<!-- sli-speech:source
PCEtLQpBZnRlciBpbnN0YWxsaW5nLCB3ZSBtdXN0IHByZXZlbnQgYXV0b21hdGljIHVwZGF0ZXMuIEJ5IGRlZmF1bHQsIHNuYXBzIGF1dG8tdXBkYXRlIHdoZW4gYSBuZXcgcmVsZWFzZSBpcyBwdWJsaXNoZWQg4oCUIHRoaXMgaXMgdW5kZXNpcmVkIGZvciBNaWNyb0Nsb3VkIGFuZCBpdHMgY29tcG9uZW50cy4KClRoZSBvZmZpY2lhbCBwcm9kdWN0aW9uIHdvcmtmbG93IGhhcyB0d28gc3RlcHMuCgpGaXJzdCwgaW5zdGFsbCBldmVyeSBzbmFwIHdpdGggYC0tY29ob3J0PSIrImAuIFRoaXMgcGlucyBhbGwgbm9kZXMgdG8gdGhlIHNhbWUgc25hcCByZXZpc2lvbiBmcm9tIHRoZSBzdGFydC4gRXZlbiBhZnRlciBhIGZ1dHVyZSByZWZyZXNoLCB0aGUgY29ob3J0IGtleSBlbnN1cmVzIGV2ZXJ5IG5vZGUgdXBkYXRlcyB0byB0aGUgc2FtZSByZXZpc2lvbiDigJQgbm8gZHJpZnRpbmcuCgpTZWNvbmQsIHJ1biBgc25hcCBob2xkYCB0byBwcmV2ZW50IGFueSBhdXRvbWF0aWMgdXBkYXRlcy4gVGhpcyBmcmVlemVzIGFsbCBzbmFwcyBhdCB0aGVpciBjdXJyZW50IHZlcnNpb24gdW50aWwgeW91IGV4cGxpY2l0bHkgdW5ob2xkIGFuZCByZWZyZXNoLgoKV2UgY2FuIHZlcmlmeSB0aGUgbG9ja2VkIHN0YXRlIHdpdGggYHNuYXAgbGlzdGAuIEV2ZXJ5IG5vZGUgc2hvdWxkIHNob3cgdGhlIHNhbWUgdmVyc2lvbiwgcmV2aXNpb24sIGFuZCBjaGFubmVsLgotLT4=
<!-- sli-speech:end -->

---

# Installing the snaps / 1

<p v-click>
The following recording runs the snap installation commands on <code>mc-01</code>.
</p>

```txt terminal name=install-snaps
Output "/tmp/l9_install_snaps.gif"
Set Shell "bash"
Set FontSize 22
Set Width 1280
Set Height 720
Set Theme Dracula
Set Padding 32
Set Framerate 30

Type "echo '=== Installing MicroCloud snaps on mc-01 ==='"
Sleep 300ms
Enter 1
Sleep 1s

Type "sudo snap install microcloud --channel=2/stable --cohort=+"
Sleep 400ms
Enter 1
Sleep 12s

Type "sudo snap install lxd --channel=5.21/stable --cohort=+"
Sleep 400ms
Enter 1
Sleep 15s

Type "sudo snap install microceph --channel=squid/stable --cohort=+"
Sleep 400ms
Enter 1
Sleep 30s

Type "sudo snap install microovn --channel=24.03/stable --cohort=+"
Sleep 400ms
Enter 1
Sleep 25s

Type "echo '=== All four snaps installed ==='"
Sleep 200ms
Enter 1
Sleep 2s
```

---

# Installing the snaps / 2

<p v-click>
Let's show the snaps installation
</p>


---

# Hardware verification

<p v-click>
Before initializing the cluster, we verify each node's hardware requirements.
</p>

<div class="grid grid-cols-3 gap-3 mt-4 text-sm">
  <div v-after.up class="p-3 rounded border border-primary/40 bg-primary/10">
    <div class="font-mono text-xs opacity-60 mb-1">1. Dedicated Disks</div>
    <div>Unformatted drives for Ceph with no existing partitions. OS must be on a separate disk</div>
  </div>
  <div v-click.after.up class="p-3 rounded border border-primary/40 bg-primary/15">
    <div class="font-mono text-xs opacity-60 mb-1">2. Network interfaces</div>
    <div>At least two NICs: one clear for uplink, one for intra-cluster OVN traffic. At least 10 Gbps recommended for production for the data plane</div>
  </div>
  <div v-click.after.up class="p-3 rounded border border-primary/40 bg-primary/15">
    <div class="font-mono text-xs opacity-60 mb-1">CPU & Memory</div>
    <div>Lab: 8 GB RAM, 4 vCPUs. Production: 32 GB RAM, 8 cores minimum per node.
 </div>
  </div>
</div>
<div v-click mt-12>
Once all checks pass, the nodes are ready for <tt>microcloud init</tt>
</div>

<!-- sli-speech:start hash=ffc57f50c353 format=wav -->
<audio class="sli-speech-track" src="./audio-cache/ffc57f50c353.wav" autoplay preload="auto"></audio>
<!-- sli-speech:source
PCEtLQpCZWZvcmUgd2UgaW5pdGlhbGlzZSB0aGUgY2x1c3Rlciwgd2UgbXVzdCBjb25maXJtIHRoYXQgZXZlcnkgbm9kZSBoYXMgdGhlIGNvcnJlY3QgaGFyZHdhcmUuCgpXZSBuZWVkIHRocmVlIHRoaW5ncy4KCkZpcnN0LCBkZWRpY2F0ZWQgZGlza3MgZm9yIENlcGguIFRoZXNlIG11c3QgYmUgdW5mb3JtYXR0ZWQgZHJpdmVzIHdpdGggbm8gZXhpc3RpbmcgcGFydGl0aW9ucyBvciBmaWxlc3lzdGVtcy4gTWljcm9DZXBoIHdpbGwgZGV0ZWN0IHRoZW0gYXV0b21hdGljYWxseSBkdXJpbmcgaW5pdGlhbGlzYXRpb24uIFRoZSBvcGVyYXRpbmcgc3lzdGVtIG11c3QgYmUgb24gYSBzZXBhcmF0ZSBkaXNrLgoKU2Vjb25kLCBhdCBsZWFzdCB0d28gbmV0d29yayBpbnRlcmZhY2VzIHBlciBtZW1iZXIuIE9uZSBmb3IgZXh0ZXJuYWwgY29ubmVjdGl2aXR5IHRvIHRoZSB1cGxpbmsgbmV0d29yayDigJQgdGhpcyBOSUMgbXVzdCBub3QgaGF2ZSBhbnkgSVAgYWRkcmVzc2VzIGFzc2lnbmVkLCBhcyBNaWNyb0Nsb3VkIHJlcXVpcmVzIHRoZSBpbnRlcmZhY2UgdG8gYmUgY2xlYXIuIFRoZSBvdGhlciBOSUMgY2FycmllcyBpbnRyYS1jbHVzdGVyIE9WTiB0dW5uZWwgdHJhZmZpYyBiZXR3ZWVuIG1lbWJlcnMuIE1pY3JvQ2xvdWQgYXNzaWducyBJUHMgdG8gdGhpcyBpbnRlcmZhY2UgYXV0b21hdGljYWxseS4gT3B0aW9uYWxseSwgYSB0aGlyZCBpbnRlcmZhY2UgY2FuIGJlIHVzZWQgZm9yIGEgZGVkaWNhdGVkIE9WTiB1bmRlcmxheSBuZXR3b3JrLiBGb3IgcHJvZHVjdGlvbiwgd2UgcmVjb21tZW5kIGR1YWwtcG9ydCBOSUNzIHdpdGggYSBtaW5pbXVtIDEwIEdpQiBjYXBhY2l0eS4gV2UgY2FuIHZlcmlmeSB0aGUgaW50ZXJmYWNlcyB3aXRoIGBpcCBhYC4KClRoaXJkLCBlbm91Z2ggbWVtb3J5IGFuZCBDUFUuIEZvciBhIGxhYiB3aXRoIHRocmVlIG5vZGVzLCA4IEdCIG9mIFJBTSBhbmQgNCBjb3JlcyBwZXIgbm9kZSBhcmUgYSBtaW5pbXVtLiBJbiBwcm9kdWN0aW9uLCByZXF1aXJlbWVudHMgc3RhcnQgYXQgMzIgR0IgUkFNIGFuZCA4IGNvcmVzIHBlciBub2RlLgoKT25jZSBhbGwgY2hlY2tzIHBhc3MsIHRoZSBub2RlcyBhcmUgcmVhZHkgZm9yIGBtaWNyb2Nsb3VkIGluaXRgLgotLT4=
<!-- sli-speech:end -->

---

# Hardware verification demo

<p v-click>
Let's verify the installation
</p>


---

# Thanks!
