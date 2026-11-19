# Run this script to expose your local port 3000 to the internet using ngrok.
# Make sure you have ngrok installed and authenticated on your system.

Write-Host "Starting ngrok to expose local port 3000..."
& "C:\Users\User\AppData\Local\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe" http 3000

Write-Host "Once ngrok is running, copy the 'Forwarding' URL (e.g. https://<id>.ngrok-free.app)"
Write-Host "Add /api/webhooks/didit to the end of it and paste it into your Didit Webhook settings!"
