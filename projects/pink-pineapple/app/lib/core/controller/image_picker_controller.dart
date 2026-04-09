import 'dart:io';
import 'package:get/get.dart';
import 'package:image_picker/image_picker.dart';

class ImagePickerController extends GetxController {
  var selectedImage = Rxn<File>();

  Future<void> pickImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery);

    if (pickedFile != null) {
      selectedImage.value = File(pickedFile.path);
    }
  }

  void resetForm() {
    selectedImage.value = null;
  }

  bool validateForm() {
    if (selectedImage.value == null) {
      Get.snackbar('Error', 'Please select an image');
      return false;
    }
    return true;
  }

  // Add method to check if image is selected or available
  bool hasImage() {
    return selectedImage.value != null;
  }

  // Get image path safely
  String? getImagePath() {
    return selectedImage.value?.path;
  }
}

/*
Usage 
  final ImagePickerController imagePicker  = Get.put(ImagePickerController());


  Obx(
                      () => GestureDetector(
                        onTap: () => imagePicker.pickImage(),
                        child: Container(
                          height: 150,
                          width: double.infinity,
                          decoration: BoxDecoration(
                            border: Border.all(color: AppColors.boderColor),
                            borderRadius: BorderRadius.circular(8),
                            color: AppColors.buttonBg,
                          ),
                          child: Center(
                            child: imagePicker.selectedImage.value == null
                                ? Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        Icons.cloud_upload_outlined,
                                        size: 50,
                                        color: AppColors.iconColor
                                            .withOpacity(0.5),
                                      ),
                                      SizedBox(height: 10),
                                      normalText(
                                        text: "Tap to upload image",
                                        color: AppColors.iconColor
                                            .withOpacity(0.6),
                                      ),
                                    ],
                                  )
                                : ClipRRect(
                                    borderRadius: BorderRadius.circular(8),
                                    child: Image.file(
                                      imagePicker.selectedImage.value!,
                                      height: double.infinity,
                                      width: double.infinity,
                                      fit: BoxFit.cover,
                                    ),
                                  ),
                          ),
                        ),
                      ),
                    ),



! while sending the data for api 
imagePath = imagePicker.selectedImage.value!.path,
just send this value 

*/
