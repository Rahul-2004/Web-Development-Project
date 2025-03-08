import os
from datetime import datetime
from flask import Flask, render_template, redirect, url_for, session, request, flash
from flask_pymongo import PyMongo
from authlib.integrations.flask_client import OAuth
from bson.objectid import ObjectId
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
print("Environment variables loaded")

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'your-secret-key')
print("Secret key set.")

# MongoDB Configuration (MONGO_URI must include your database name)
MONGO_URI = os.environ.get('MONGO_URI')
if not MONGO_URI:
    raise ValueError("MONGO_URI is not set. Please check your .env file.")
print("MONGO_URI:", MONGO_URI)
app.config['MONGO_URI'] = MONGO_URI
mongo = PyMongo(app)

def test_mongo_connection():
    try:
        mongo.db.command('ping')
        print("MongoDB connection successful!")
        return True
    except Exception as e:
        print(f"MongoDB connection error: {e}")
        return False

test_mongo_connection()

# Helper function to get the latest available closing price using Alpha Vantage
def get_last_trading_price(symbol):
    api_key = os.environ.get("ALPHA_VANTAGE_API_KEY")
    if not api_key:
        print("Alpha Vantage API key is not set.")
        return None
    url = f"https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={symbol}&apikey={api_key}"
    try:
        response = requests.get(url)
        data = response.json()
        if "Global Quote" in data and data["Global Quote"]:
            price_str = data["Global Quote"].get("05. price")
            if price_str:
                return float(price_str)
            else:
                print(f"{symbol}: Price not found in Alpha Vantage response.")
                return None
        else:
            print(f"{symbol}: No price data found from Alpha Vantage.")
            return None
    except Exception as e:
        print(f"Alpha Vantage error for {symbol}: {e}")
        return None

# Google OAuth Configuration
oauth = OAuth(app)
google = oauth.register(
    name='google',
    client_id=os.environ.get('GOOGLE_CLIENT_ID'),
    client_secret=os.environ.get('GOOGLE_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

###############################################################################
#                                ROUTES                                       #
###############################################################################

# Landing page with Signup and Login buttons
@app.route('/')
def landing():
    return render_template('landing.html')

# Signup: set auth_mode to 'signup' and initiate OAuth
@app.route('/signup')
def signup():
    session['auth_mode'] = 'signup'
    return google.authorize_redirect(url_for('callback', _external=True))

# Login: set auth_mode to 'login' and initiate OAuth
@app.route('/login')
def login():
    session['auth_mode'] = 'login'
    return google.authorize_redirect(url_for('callback', _external=True))

# OAuth callback endpoint for both Signup and Login flows
@app.route('/login/callback')
def callback():
    try:
        token = google.authorize_access_token()
        user_info = google.userinfo(token=token)
        email = user_info.get('email')
        session['user'] = {
            'email': email,
            'name': user_info.get('name'),
            'picture': user_info.get('picture')
        }
        auth_mode = session.get('auth_mode')
        if auth_mode == 'signup':
            existing_user = mongo.db.users.find_one({'email': email})
            if existing_user:
                flash("User already exists. Logging you in.")
                return redirect(url_for('dashboard'))
            else:
                mongo.db.users.insert_one({
                    'email': email,
                    'name': user_info.get('name', ''),
                    'picture': user_info.get('picture', ''),
                    'created_at': datetime.now()
                })
                session['is_new_user'] = True
                return redirect(url_for('new_user'))
        elif auth_mode == 'login':
            existing_user = mongo.db.users.find_one({'email': email})
            if existing_user:
                flash("Login successful!")
                return redirect(url_for('dashboard'))
            else:
                flash("Not a registered user. Please sign up first.")
                return redirect(url_for('landing'))
        else:
            flash("Invalid authentication mode.")
            return redirect(url_for('landing'))
    except Exception as e:
        flash(f"Authentication failed: {e}")
        return redirect(url_for('landing'))

# Logout route
@app.route('/logout')
def logout():
    session.pop('user', None)
    session.pop('auth_mode', None)
    session.pop('is_new_user', None)
    flash("Logged out successfully.")
    return redirect(url_for('landing'))

# New User Page: For new users to add their first stock.
# They can add multiple stocks via the form or click "Skip" to go to the dashboard.
@app.route('/new_user', methods=['GET', 'POST'])
def new_user():
    if 'user' not in session:
        return redirect(url_for('login'))
    if request.method == 'POST':
        symbol = request.form.get('symbol', '').upper()
        try:
            buy_price = float(request.form.get('buy_price', 0))
            quantity = int(request.form.get('quantity', 0))
        except ValueError:
            flash("Invalid stock details. Please check your input.")
            return redirect(url_for('new_user'))
        if not symbol or buy_price <= 0 or quantity <= 0:
            flash("Invalid stock details. Please check your input.")
            return redirect(url_for('new_user'))
        current_price = get_last_trading_price(symbol)
        if current_price is None:
            flash("Invalid stock symbol or no price data available.")
            return redirect(url_for('new_user'))
        mongo.db.stocks.insert_one({
            'user_email': session['user']['email'],
            'symbol': symbol,
            'buy_price': buy_price,
            'quantity': quantity,
            'purchase_date': datetime.now()
        })
        flash(f"Added {quantity} shares of {symbol}.")
        return redirect(url_for('new_user'))
    else:
        user_email = session['user']['email']
        user_stocks = list(mongo.db.stocks.find({'user_email': user_email}))
        for stock in user_stocks:
            stock['_id'] = str(stock['_id'])
            current_price = get_last_trading_price(stock['symbol'])
            if current_price is not None:
                stock['current_price'] = round(current_price, 2)
            else:
                stock['current_price'] = 'N/A'
        return render_template('new_user.html', user=session['user'], stocks=user_stocks)

# Route to add stocks from the dashboard
@app.route('/add_stock_dashboard', methods=['GET', 'POST'])
def add_stock_dashboard():
    if 'user' not in session:
        return redirect(url_for('login'))
    if request.method == 'POST':
        symbol = request.form.get('symbol', '').upper()
        try:
            buy_price = float(request.form.get('buy_price', 0))
            quantity = int(request.form.get('quantity', 0))
        except ValueError:
            flash("Invalid stock details. Please check your input.")
            return redirect(url_for('add_stock_dashboard'))
        if not symbol or buy_price <= 0 or quantity <= 0:
            flash("Invalid stock details. Please check your input.")
            return redirect(url_for('add_stock_dashboard'))
        current_price = get_last_trading_price(symbol)
        if current_price is None:
            flash("Invalid stock symbol or no price data available.")
            return redirect(url_for('add_stock_dashboard'))
        mongo.db.stocks.insert_one({
            'user_email': session['user']['email'],
            'symbol': symbol,
            'buy_price': buy_price,
            'quantity': quantity,
            'purchase_date': datetime.now()
        })
        flash(f"Added {quantity} shares of {symbol}.")
        return redirect(url_for('dashboard'))
    return render_template('add_stock.html', user=session['user'])

# Dashboard: Displays a table of the user's stocks with profit/loss calculations.
@app.route('/dashboard')
def dashboard():
    if 'user' not in session:
        return redirect(url_for('landing'))
    user_email = session['user']['email']
    user_stocks = list(mongo.db.stocks.find({'user_email': user_email}))
    for stock in user_stocks:
        stock['_id'] = str(stock['_id'])
        current_price = get_last_trading_price(stock['symbol'])
        if current_price is not None:
            stock['current_price'] = round(current_price, 2)
            stock['profit_loss'] = round((current_price - stock['buy_price']) * stock['quantity'], 2)
            if stock['buy_price'] > 0:
                stock['profit_loss_percentage'] = round(((current_price - stock['buy_price']) / stock['buy_price']) * 100, 2)
            else:
                stock['profit_loss_percentage'] = 'N/A'
        else:
            stock['current_price'] = 'N/A'
            stock['profit_loss'] = 'N/A'
            stock['profit_loss_percentage'] = 'N/A'
    return render_template('dashboard.html', user=session['user'], stocks=user_stocks)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
