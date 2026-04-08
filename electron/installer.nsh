; SQA Traceability NSIS Custom Script
; Automatically opens Windows Firewall port 8765 for LAN access

!macro customInstall
  DetailPrint "Opening Windows Firewall for SQA Traceability (Port 8765)..."
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="SQA Traceability Server" dir=in action=allow protocol=TCP localport=8765 profile=private,domain'
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="SQA Traceability mDNS" dir=in action=allow protocol=UDP localport=5353 profile=private,domain'
  DetailPrint "Firewall rules added successfully."
!macroend

!macro customUninstall
  DetailPrint "Removing Windows Firewall rules..."
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="SQA Traceability Server"'
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="SQA Traceability mDNS"'
!macroend
