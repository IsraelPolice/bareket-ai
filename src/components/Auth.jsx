import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Input, Button, VStack, Text, useToast } from "@chakra-ui/react";
import { auth } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

const Auth = ({ isSignUp }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const toast = useToast();

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleAuth = async () => {
    // ולידציה למייל
    if (!validateEmail(email)) {
      toast({
        title: "שגיאה",
        description: "נא להזין כתובת מייל תקינה",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // ולידציה לסיסמה (מינימום 6 תווים, כדרישת Firebase)
    if (password.length < 6) {
      toast({
        title: "שגיאה",
        description: "הסיסמה חייבת להכיל לפחות 6 תווים",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        toast({ title: "הרשמה הצליחה", status: "success", duration: 3000 });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: "התחברות הצליחה", status: "success", duration: 3000 });
      }
      navigate("/dashboard");
    } catch (error) {
      toast({
        title: "שגיאה",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Box p={4} maxW="md" mx="auto" mt={10}>
      <VStack spacing={4}>
        <Text fontSize="2xl">{isSignUp ? "הרשמה" : "התחברות"}</Text>
        <Input
          placeholder="אימייל"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email" // הוספת type="email" לולידציה בסיסית בדפדפן
        />
        <Input
          type="password"
          placeholder="סיסמה"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button colorScheme="teal" onClick={handleAuth}>
          {isSignUp ? "הירשם" : "התחבר"}
        </Button>
        <Button
          variant="link"
          onClick={() => navigate(isSignUp ? "/login" : "/signup")}
        >
          {isSignUp ? "כבר יש לך חשבון? התחבר" : "חדש כאן? הירשם"}
        </Button>
      </VStack>
    </Box>
  );
};

export default Auth;
