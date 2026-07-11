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
<!--
The last comment block of each slide will be treated as slide notes. It will be visible and editable in Presenter Mode along with the slide. [Read more in the docs](https://sli.dev/guide/syntax.html#notes)
-->

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
       <li>suid/stable</li>
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

---

# Installing the snaps / 1

<p v-click>
Let's show the snaps installation
</p>

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

---

# Hardware verification demo

<p v-click>
Let's verify the installation
</p>


---

# Thanks!
