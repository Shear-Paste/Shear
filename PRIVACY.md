# Privacy Policy

**Last Updated:** 2025-11-30

This Privacy Policy describes how Shear ("we", "our", or "us") collects, uses, and stores your information when you use our clipboard service.

## 1. Information We Collect

We collect the following information when you use our service:

*   **Clipboard Content:** The text content you submit to the service.
*   **Security Credentials:**
    *   **Passwords:** If you choose to password-protect your clipboard, we store a SHA-256 hash of your password. We do not store the plain text password.
    *   **Access Tokens:** We generate and store a SHA-256 hash of an access token to verify your identity for editing or deleting your content.
*   **Technical Information:**
    *   **IP Address:** We temporarily process your IP address to implement rate limiting (preventing abuse). This information is stored in memory and is used to restrict requests (e.g., 1 request per minute). It is not permanently stored in our database files.

## 2. How We Store Your Data

*   **Storage Mechanism:** Your data is stored in local JSON files on our server.
*   **Encryption:**
    *   **Content:** Clipboard content is currently stored in plain text on the server. Please do not store highly sensitive information (like credit card numbers or private keys) without your own encryption.
    *   **Credentials:** Passwords and access tokens are hashed using SHA-256 before storage.

## 3. Data Retention

*   **Indefinite Storage:** By default, your clipboard data is stored indefinitely until you explicitly delete it.
*   **Deletion:** You can delete your clipboard data at any time using the "Delete" function, provided you have the correct access token (which is handled automatically by your browser/session if you are the creator).

## 4. How We Use Your Information

We use the collected information solely for the purpose of:
*   Providing the clipboard storage and retrieval service.
*   Enforcing security (password protection).
*   Preventing abuse (rate limiting).

## 5. Data Sharing

We do not sell, trade, or otherwise transfer your information to outside parties. The content you create is accessible to anyone who has the unique link (and password, if set).

## 6. Security

While we implement hashing for credentials, please be aware that no method of transmission over the Internet or method of electronic storage is 100% secure. We strive to use commercially acceptable means to protect your information but cannot guarantee its absolute security.

## 7. Changes to This Policy

We may update this privacy policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
