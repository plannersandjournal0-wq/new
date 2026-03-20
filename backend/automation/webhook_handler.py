from datetime import datetime, timezone
from typing import Dict, Optional
import logging
import uuid

logger = logging.getLogger(__name__)

class WebhookHandler:
    """Handles webhook events with idempotency protection"""
    
    def __init__(self, db):
        self.db = db
    
    async def handle_webhook(self, webhook_data: Dict, is_simulated: bool = False) -> Dict:
        """
        Handle incoming webhook with idempotency protection.
        
        Args:
            webhook_data: The webhook payload
            is_simulated: Whether this is a simulated webhook
            
        Returns:
            Order creation result
        """
        try:
            # Extract data
            external_order_id = webhook_data.get("orderId") or webhook_data.get("externalOrderId")
            webhook_event_id = webhook_data.get("eventId", external_order_id)
            
            if not external_order_id:
                raise ValueError("Missing orderId in webhook data")
            
            # Idempotency check
            existing_order = await self.db.automation_orders.find_one({
                "externalOrderId": external_order_id
            })
            
            if existing_order:
                logger.info(f"Order {external_order_id} already exists (idempotent)")
                return {
                    "received": True,
                    "orderId": existing_order["id"],
                    "status": existing_order["status"],
                    "message": "Order already processed (idempotent)",
                    "isExisting": True
                }
            
            # Create new order
            order = await self._create_order(webhook_data, is_simulated)
            
            logger.info(f"New order created: {order['id']} (external: {external_order_id})")
            
            return {
                "received": True,
                "orderId": order["id"],
                "status": "received",
                "message": "Webhook received and order created",
                "isExisting": False
            }
            
        except Exception as e:
            logger.error(f"Webhook handling failed: {str(e)}")
            raise
    
    async def _create_order(self, webhook_data: Dict, is_simulated: bool) -> Dict:
        """Create a new automation order from webhook data"""
        
        # Generate order ID
        order_id = str(uuid.uuid4())
        
        # Extract external order ID
        external_order_id = webhook_data.get("orderId") or webhook_data.get("externalOrderId")
        
        # Extract customer data
        customer_data = {
            "requestedName": webhook_data.get("requestedName") or webhook_data.get("customerName"),
            "buyerFullName": webhook_data.get("buyerFullName") or webhook_data.get("requestedName"),
            "customerEmail": webhook_data.get("customerEmail") or webhook_data.get("email", ""),
            "password": webhook_data.get("password"),
            "customFields": webhook_data.get("customFields", {})
        }
        
        # Validate required fields
        if not customer_data["requestedName"]:
            raise ValueError("requestedName is required")
        if not customer_data["customerEmail"]:
            raise ValueError("customerEmail is required")
        
        # Extract product slug
        product_slug = webhook_data.get("productSlug")
        if not product_slug:
            raise ValueError("productSlug is required")
        
        # Extract payment data (optional)
        payment_data = webhook_data.get("paymentData", {})
        if not payment_data and not is_simulated:
            # Try to extract from top level
            payment_data = {
                "amount": webhook_data.get("amount"),
                "currency": webhook_data.get("currency"),
                "paymentMethod": webhook_data.get("paymentMethod"),
                "transactionId": webhook_data.get("transactionId")
            }
        
        # Create order document
        order = {
            "id": order_id,
            "externalOrderId": external_order_id,
            "webhookEventId": webhook_data.get("eventId", external_order_id),
            "isSimulatedWebhook": is_simulated,
            "customerData": customer_data,
            "productSlug": product_slug,
            "templateId": None,
            "templateTitle": None,
            "templateSnapshot": None,
            "paymentData": payment_data if payment_data else None,
            "status": "received",
            "generationLocked": False,
            "lockedAt": None,
            "finalizedAt": None,
            "personalizedPdfPath": None,
            "personalizedPdfUrl": None,
            "storybookId": None,
            "storybookSlug": None,
            "customerViewUrl": None,
            "processingLog": [
                {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "status": "received",
                    "message": f"Webhook received ({'simulated' if is_simulated else 'real'})"
                }
            ],
            "errorMessage": None,
            "errorDetails": None,
            "retryCount": 0,
            "lastRetryAt": None,
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "updatedAt": datetime.now(timezone.utc).isoformat(),
            "completedAt": None
        }
        
        # Insert into database
        await self.db.automation_orders.insert_one(order)
        
        return order
    
    async def verify_creem_signature(self, payload: Dict, signature: str) -> bool:
        """
        Verify Creem webhook signature.
        
        Args:
            payload: The webhook payload
            signature: The creem-signature header
            
        Returns:
            True if signature is valid
            
        Note: Implementation depends on Creem's signature algorithm
        """
        # TODO: Implement actual Creem signature verification
        # For now, return True for development
        logger.warning("Creem signature verification not yet implemented")
        return True
