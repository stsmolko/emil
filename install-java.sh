#!/bin/bash

echo "================================"
echo "Installing Java 21 for Firebase"
echo "================================"
echo ""

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "📦 Homebrew not found. Installing Homebrew first..."
    echo "⚠️  This will require your password and may take a few minutes."
    echo ""
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add Homebrew to PATH for Apple Silicon
    if [ -f /opt/homebrew/bin/brew ]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
    
    # Add Homebrew to PATH for Intel
    if [ -f /usr/local/bin/brew ]; then
        echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/usr/local/bin/brew shellenv)"
    fi
    
    echo "✅ Homebrew installed!"
    echo ""
else
    echo "✅ Homebrew already installed"
    echo ""
fi

# Install Java 21
echo "☕ Installing Java 21..."
brew install openjdk@21

# Link Java 21
echo ""
echo "🔗 Setting up Java 21..."
sudo ln -sfn $(brew --prefix)/opt/openjdk@21/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-21.jdk

# Add to PATH
echo ""
echo "📝 Adding Java to PATH..."
if ! grep -q "openjdk@21" ~/.zprofile; then
    echo 'export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"' >> ~/.zprofile
    echo 'export PATH="/usr/local/opt/openjdk@21/bin:$PATH"' >> ~/.zprofile
fi

# Verify installation
echo ""
echo "🔍 Verifying Java installation..."
source ~/.zprofile
java -version

echo ""
echo "================================"
echo "✅ Java 21 installed successfully!"
echo "================================"
echo ""
echo "Now you can run: firebase emulators:start"
echo ""
