import 'package:get/get.dart';

class ReportController extends GetxController {
  final RxBool isFirstPage = true.obs;
  final RxString selectedReport = ''.obs;
  final List<String> reports = <String>[
    'Scammer',
    'Dangerous Item',
    'Violence',
    "I don’t like this",
    "Not available to buy",
    "Sexual harassment",
    "Rude behavior",
    "Something else",
  ];

  void goLastPage() {
    isFirstPage.value = !isFirstPage.value;
  }
}
