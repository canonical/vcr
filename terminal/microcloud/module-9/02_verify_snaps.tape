Output "/tmp/l9_verify_snaps.gif"
Set Shell "bash"
Set FontSize 22
Set Width 1280
Set Height 720
Set Theme Dracula
Set Padding 32
Set Framerate 30

Type "echo '>>> Verifying installed snap versions <<<'"
Sleep 300ms
Enter 1
Sleep 1s

Type "snap list --unicode=never"
Sleep 400ms
Enter 1
Sleep 3s

Type "echo '>>> Holding snaps for version consistency <<<'"
Sleep 300ms
Enter 1
Sleep 1s

Type "sudo snap refresh --hold microcloud lxd microceph microovn"
Sleep 300ms
Enter 1
Sleep 2s

Type "echo 'Holds applied across all four snaps'"
Sleep 200ms
Enter 1
Sleep 2s
