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
