Whale terminal

strategy table -> one to many with order table

orders :
add column :
strategy_id : nullable

strategy :

id
user_id
preset_id
wallet_address
pool_address
created_At
status

presets. :

userid,
"config": [
{
"tp_percent": 20.0,
"sell_percent": 50.0
},
{
"tp_percent": 50.0,
"sell_percent": 30.0
},
{
"sl_percent": 20.0,
"sell_percent": 20.0
}
]

Strategy deletion: When you delete a strategy, the preset it references will NOT be deleted - it remains completely independent.

Order deletion: When you delete a strategy, the orders that reference it will have their strategy_id set to NULL (due to ON DELETE SET NULL).
we will have to send a event to lightning orders to cancel those orders.
# z-terminal
