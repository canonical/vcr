Output "/tmp/l9_check_resources.gif"
Set Shell "bash"
Set FontSize 22
Set Width 1280
Set Height 720
Set Theme Dracula
Set Padding 32
Set Framerate 30

Type "echo '>>> Hardware check on mc-01 <<<'"
Sleep 200ms
Enter 1
Sleep 1s

Type "echo '--- Block devices ---'"
Sleep 200ms
Enter 1
Sleep 300ms
Type "lsblk"
Sleep 400ms
Enter 1
Sleep 3s

Type "echo '--- CPUs ---'"
Sleep 200ms
Enter 1
Sleep 300ms
Type "nproc"
Sleep 400ms
Enter 1
Sleep 2s

Type "echo '--- Network interfaces ---'"
Sleep 200ms
Enter 1
Sleep 300ms
Type "ip -br addr"
Sleep 400ms
Enter 1
Sleep 3s

Type "echo '--- Memory ---'"
Sleep 200ms
Enter 1
Sleep 300ms
Type "free -h"
Sleep 400ms
Enter 1
Sleep 3s

Type "echo '=== Hardware checks passed - ready for microcloud init ==='"
Sleep 200ms
Enter 1
Sleep 2s
