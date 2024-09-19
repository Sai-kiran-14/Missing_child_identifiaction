from deepface import DeepFace
import sys

# Check if the correct number of arguments are provided
if len(sys.argv) < 3:
    print("Usage: python face_recognition_cnn.py <database_image_path> <uploaded_image_path>")
    sys.exit(1)

# Paths to the images
db_image_path = sys.argv[1]  # Path to the database image
uploaded_image_path = sys.argv[2]  # Path to the uploaded image for recognition

try:
    # Perform face recognition using DeepFace
    result = DeepFace.verify(db_image_path, uploaded_image_path)

    if result["verified"]:
        print("Match found!")
    else:
        print("No match found.")
except Exception as e:
    print(f"Error during face recognition: {str(e)}")














# from deepface import DeepFace
# import sys
# from PIL import Image
# import os

# Check if the correct number of arguments are provided
# if len(sys.argv) < 3:
#     print("Usage: python face_recognition_cnn.py <database_image_path> <uploaded_image_path>")
#     sys.exit(1)



# db_image_path = "dataset\harmoine_1.png"
# uploaded_image_path = "dataset\harmoine_2.png"

# Perform face recognition
# result = DeepFace.verify(db_image_path, uploaded_image_path)

# if result["verified"]:
#     print("Match found!")
# else:
#     print("No match found.")
# Paths to the images
# db_image_path = "C:\Users\saiki\OneDrive\Desktop\myProject\public\uploads\harmoine_1.png"
# os.path.abspath(sys.argv[1])  # Absolute path to the database image
# uploaded_image_path = "C:\Users\saiki\OneDrive\Desktop\myProject\dataset\harmoine_2.png"
# os.path.abspath(sys.argv[2])  # Absolute path to the uploaded image

# Log the paths being used
# print(f"Database image path: {db_image_path}")
# print(f"Uploaded image path: {uploaded_image_path}")

# Function to check if the image can be opened and is in a valid format
# def check_image(image_path):
#     try:
#         img = Image.open(image_path)
#         img.verify()  # Verify that it's a valid image
#         print(f"Image {image_path} opened successfully.")
#     except Exception as e:
#         print(f"Error opening image {image_path}: {str(e)}")
#         sys.exit(1)

# Check if images can be opened
# check_image(db_image_path)
# check_image(uploaded_image_path)

# Reopen the images for processing (necessary after verify())
# db_image = Image.open(db_image_path).convert('RGB')  # Convert to RGB to ensure compatibility
# uploaded_image = Image.open(uploaded_image_path).convert('RGB')

# Save them temporarily to ensure they are correctly formatted
# db_image.save("cleaned_db_image.jpg")
# uploaded_image.save("cleaned_uploaded_image.jpg")

# Perform face recognition
# try:
#     result = DeepFace.verify("cleaned_db_image.jpg", "cleaned_uploaded_image.jpg", model_name="Facenet")

#     if result["verified"]:
#         print("Match found")
#     else:
#         print("No match found")
# except Exception as e:
#     print(f"Error during face recognition: {str(e)}")
