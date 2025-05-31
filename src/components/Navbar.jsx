import React from "react";
import { Box, Button, HStack, Text } from "@chakra-ui/react";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (error) {
      toast.error("Logout failed: " + error.message);
    }
  };

  return (
    <Box bg="blue.500" p={4}>
      <HStack justify="space-between">
        <Text color="white" fontSize="xl">
          Bareket AI
        </Text>
        <HStack>
          {user ? (
            <>
              <Text color="white">Credits: 10</Text>
              <Button colorScheme="red" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button colorScheme="green" onClick={() => navigate("/login")}>
                Login
              </Button>
              <Button colorScheme="teal" onClick={() => navigate("/signup")}>
                Sign Up
              </Button>
            </>
          )}
        </HStack>
      </HStack>
    </Box>
  );
};

export default Navbar;
