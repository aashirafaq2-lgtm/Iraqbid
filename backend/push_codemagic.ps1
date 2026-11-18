Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class Cred {
    [DllImport("Advapi32.dll", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool CredRead(string target, int type, int reservedFlag, out IntPtr credentialPtr);

    [DllImport("Advapi32.dll", EntryPoint = "CredFree", SetLastError = true)]
    public static extern void CredFree(IntPtr buffer);

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct CREDENTIAL {
        public int Flags;
        public int Type;
        public string TargetName;
        public string Comment;
        public long LastWritten;
        public int CredentialBlobSize;
        public IntPtr CredentialBlob;
        public int Persist;
        public int AttributeCount;
        public IntPtr Attributes;
        public string TargetAlias;
        public string UserName;
    }

    public static string GetPassword(string target) {
        IntPtr credPtr;
        if (CredRead(target, 1, 0, out credPtr)) {
            CREDENTIAL cred = (CREDENTIAL)Marshal.PtrToStructure(credPtr, typeof(CREDENTIAL));
            byte[] b = new byte[cred.CredentialBlobSize];
            Marshal.Copy(cred.CredentialBlob, b, 0, cred.CredentialBlobSize);
            CredFree(credPtr);
            return Encoding.Unicode.GetString(b);
        }
        return null;
    }
}
"@

$token = [Cred]::GetPassword("git:https://github.com")
if (-not $token) {
    Write-Error "Could not retrieve GitHub token."
    exit 1
}

Set-Location "E:\Ahmed work\temp-codemagic-repo"

git add -A
git commit -m "Release v1.0.3 (Build 14): Product details horizontal countdown & bid stepper layout, warning alert color logic, simplified Buy Now confirmation, profile screen overhaul (removed wallet & withdraw), and phone pre-check on auth"

$remoteUrl = "https://aashirafaq2-lgtm:$token@github.com/aashirafaq2-lgtm/iraq-bid-app.git"

Write-Output "Pushing to github.com/aashirafaq2-lgtm/iraq-bid-app.git (master)..."
git push $remoteUrl master

Write-Output "Push completed!"
