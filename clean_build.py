import os
import shutil
import subprocess
import sys
import platform

def run_command(command, cwd=None, env=None, shell=True):
    try:
        print(f"Running: {command}")
        subprocess.run(command, cwd=cwd, env=env, shell=shell, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error executing command: {command}")
        sys.exit(1)

def delete_directory(path):
    if os.path.exists(path):
        print(f"Deleting: {path}")
        try:
            shutil.rmtree(path)
        except Exception as e:
            print(f"Warning: Failed to delete {path}. Reason: {e}")

def main():
    # Define paths
    project_root = os.getcwd()
    android_dir = os.path.join(project_root, "android")
    
    # 1. Set JAVA_HOME to the specific JDK 17 path found previously
    # Using raw string to handle backslashes correctly
    java_home = r"C:\Users\Demensdeum\.gradle\jdks\eclipse_adoptium-17-amd64-windows.2"
    
    if not os.path.exists(java_home):
        print(f"Error: JAVA_HOME path does not exist at: {java_home}")
        # Assuming the build might still work or fail later if this is wrong, 
        # but for now we enforce it as requested.
        # sys.exit(1) 

    # Update environment variables for the subprocesses
    env = os.environ.copy()
    env["JAVA_HOME"] = java_home
    # Prepend new JAVA_HOME/bin to PATH
    env["PATH"] = f"{java_home}\\bin;{env.get('PATH', '')}"

    print(f"Using JAVA_HOME: {java_home}")
    
    # Verify Java version
    run_command("java -version", env=env)

    # 2. Clean Android Project
    print("\n--- Cleaning Android Project ---")
    gradlew = "gradlew.bat" if platform.system() == "Windows" else "./gradlew"
    
    # Run gradlew clean inside android directory
    run_command(f"{gradlew} clean", cwd=android_dir, env=env)

    # 3. Manually delete build artifacts (aggressive clean)
    print("\n--- Removing Build Artifacts ---")
    dirs_to_remove = [
        os.path.join(android_dir, "app", ".cxx"),
        os.path.join(android_dir, "app", "build"),
        os.path.join(android_dir, ".cxx"),
        os.path.join(android_dir, "build"),
    ]
    
    for d in dirs_to_remove:
        delete_directory(d)

    # 4. Start Build
    print("\n--- Starting Expo Android Build ---")
    # Using 'npx' requires shell=True on Windows usually
    run_command("npx expo run:android --variant debug", cwd=project_root, env=env)

if __name__ == "__main__":
    main()
