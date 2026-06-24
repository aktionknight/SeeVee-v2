from cryptography.fernet import Fernet, InvalidToken
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

def get_fernet() -> Fernet:
    if not settings.ENCRYPTION_KEY:
        raise ValueError("ENCRYPTION_KEY is not set in environment variables.")
    return Fernet(settings.ENCRYPTION_KEY.encode('utf-8'))

def encrypt_value(plaintext: str) -> str:
    if not plaintext:
        return ""
    fernet = get_fernet()
    return fernet.encrypt(plaintext.encode('utf-8')).decode('utf-8')

def decrypt_value(ciphertext: str) -> str:
    if not ciphertext:
        return ""
    try:
        fernet = get_fernet()
        return fernet.decrypt(ciphertext.encode('utf-8')).decode('utf-8')
    except InvalidToken:
        logger.error("Failed to decrypt value. Invalid token or wrong ENCRYPTION_KEY.")
        raise ValueError("Decryption failed.")

def mask_api_key(key: str) -> str:
    if not key:
        return ""
    if len(key) <= 4:
        return "****"
    return f"****{key[-4:]}"
