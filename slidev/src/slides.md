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
Before we initialise the cluster, we need to prepare each node.

The process has four steps.
First, we install the snaps — MicroCloud, LXD, MicroCeph, and MicroOVN.
Second, we lock the snap versions so every node runs the same release.
Third, we check the hardware — disks, network interfaces, and memory.
Fourth and finally, we run a quick pre-flight check to make sure everything is ready.

We will do this on the first node, mc-01. The same steps are repeated on mc-02 and mc-03 identically.
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

<!--
Before we initialise the cluster, we need to prepare each node.

The process has four steps.
First, we install the snaps — MicroCloud, LXD, MicroCeph, and MicroOVN.
Second, we lock the snap versions so every node runs the same release.
Third, we check the hardware — disks, network interfaces, and memory.
Fourth and finally, we run a quick pre-flight check to make sure everything is ready.

We will do this on the first node, mc-01. The same steps are repeated on mc-02 and mc-03 identically.
-->

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

<!--
Let us look at the installation command.

We install four snaps using the long-term support channel for each component:
- MicroCloud on the 2/stable channel, which is the current LTS track.
- LXD on 5.21/stable, the LTS track for LXD.
- MicroCeph on squid/stable — Squid is the latest LTS Ceph release.
- MicroOVN on 24.03/stable, paired with the same Ubuntu release.

Using LTS channels means the versions stay stable over time. There are no unexpected feature changes during a delivery.

The installation takes about one minute per snap. On the three nodes you would do this in parallel, or through a configuration management tool.

Once all four are installed, confirm with `snap list`.
-->

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

<!--
After installing, we must prevent automatic updates. By default, snaps auto-update when a new release is published — this is undesired for MicroCloud and its components.

The official production workflow has two steps.

First, install every snap with `--cohort="+"`. This pins all nodes to the same snap revision from the start. Even after a future refresh, the cohort key ensures every node updates to the same revision — no drifting.

Second, run `snap hold` to prevent any automatic updates. This freezes all snaps at their current version until you explicitly unhold and refresh.

We can verify the locked state with `snap list`. Every node should show the same version, revision, and channel.
-->

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

<!--
Before we initialise the cluster, we must confirm that every node has the correct hardware.

We need three things.

First, dedicated disks for Ceph. These must be unformatted drives with no existing partitions or filesystems. MicroCeph will detect them automatically during initialisation. The operating system must be on a separate disk.

Second, at least two network interfaces per member. One for external connectivity to the uplink network — this NIC must not have any IP addresses assigned, as MicroCloud requires the interface to be clear. The other NIC carries intra-cluster OVN tunnel traffic between members. MicroCloud assigns IPs to this interface automatically. Optionally, a third interface can be used for a dedicated OVN underlay network. For production, we recommend dual-port NICs with a minimum 10 GiB capacity. We can verify the interfaces with `ip a`.

Third, enough memory and CPU. For a lab with three nodes, 8 GB of RAM and 4 cores per node are a minimum. In production, requirements start at 32 GB RAM and 8 cores per node.

Once all checks pass, the nodes are ready for `microcloud init`.
-->

---

# Hardware verification demo

<p v-click>
Let's verify the installation
</p>


---

# Thanks!
