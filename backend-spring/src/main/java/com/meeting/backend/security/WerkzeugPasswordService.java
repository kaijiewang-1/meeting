package com.meeting.backend.security;

import org.bouncycastle.crypto.generators.SCrypt;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Service
public class WerkzeugPasswordService {
    public boolean matches(String rawPassword, String encodedPassword) {
        if (encodedPassword == null || !encodedPassword.startsWith("scrypt:")) {
            return false;
        }
        String[] parts = encodedPassword.split("\\$");
        if (parts.length != 3) {
            return false;
        }
        String[] method = parts[0].split(":");
        if (method.length != 4) {
            return false;
        }
        int n = Integer.parseInt(method[1]);
        int r = Integer.parseInt(method[2]);
        int p = Integer.parseInt(method[3]);
        byte[] salt = parts[1].getBytes(StandardCharsets.UTF_8);
        byte[] expected = hexToBytes(parts[2]);
        byte[] actual = SCrypt.generate(rawPassword.getBytes(StandardCharsets.UTF_8), salt, n, r, p, expected.length);
        return MessageDigest.isEqual(expected, actual);
    }

    private byte[] hexToBytes(String hex) {
        byte[] out = new byte[hex.length() / 2];
        for (int i = 0; i < out.length; i++) {
            int idx = i * 2;
            out[i] = (byte) Integer.parseInt(hex.substring(idx, idx + 2), 16);
        }
        return out;
    }
}
