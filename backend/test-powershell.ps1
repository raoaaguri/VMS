# Test Public PO API with PowerShell
Write-Host "🧪 Testing Public PO API with PowerShell..."

$payload = @{
    po = @{
        po_number = "PS_TEST_" + [int][double]::Parse((Get-Date -UFormat %s))
        vendor_id = "3"
        type = "NEW_ITEMS"
        priority = "MEDIUM"
        po_date = "2026-03-03"
    }
    line_items = @(
        @{
            product_code = 1001
            product_name = "PowerShell Test Product"
            quantity = 5
            gst_percent = 18
            price = 100
            mrp = 120
            line_priority = "MEDIUM"
        }
    )
}

$jsonPayload = $payload | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/public/pos" -Method POST -ContentType "application/json" -Body $jsonPayload -TimeoutSec 30

    Write-Host "📡 Status: $($response.StatusCode)"
    Write-Host "📄 Response:"
    Write-Host $response.Content
    
    if ($response.StatusCode -eq 201) {
        Write-Host "✅ Public PO API works!"
    } else {
        Write-Host "❌ PO Creation failed"
    }
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)"
}
